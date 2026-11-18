-- place_order / cancel_order / topup_wallet
-- Every stock change writes a stock_movements row and every balance change writes a
-- wallet_transactions row inside the same function call, so each is atomic.

CREATE OR REPLACE FUNCTION place_order(p_user_id INT, p_slot_id INT, p_items JSONB)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_role     user_role;
  v_slot     pickup_slots%ROWTYPE;
  v_booked   INT;
  v_line     RECORD;
  v_need     RECORD;
  v_item     RECORD;
  v_avail    INT;
  v_total    NUMERIC(10,2) := 0;
  v_balance  NUMERIC(10,2);
  v_order_id INT;
BEGIN
  SELECT role INTO v_role FROM users WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % not found', p_user_id;
  END IF;
  IF v_role <> 'student' THEN
    RAISE EXCEPTION 'only students can place orders';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'an order needs at least one item';
  END IF;

  -- 1. Slot: lock it so two orders cannot both take the last place.
  SELECT * INTO v_slot FROM pickup_slots WHERE slot_id = p_slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pickup slot % not found', p_slot_id;
  END IF;
  IF (v_slot.slot_date + v_slot.start_time) <= localtimestamp THEN
    RAISE EXCEPTION 'that pickup slot has already started';
  END IF;
  SELECT count(*) INTO v_booked FROM orders WHERE slot_id = p_slot_id AND status <> 'cancelled';
  IF v_booked >= v_slot.capacity THEN
    RAISE EXCEPTION 'that pickup slot is full';
  END IF;

  -- Lock every ingredient the order touches (fixed order, so no deadlocks between orders).
  PERFORM 1
  FROM ingredients
  WHERE ingredient_id IN (
    SELECT r.ingredient_id
    FROM recipe_items r
    WHERE r.item_id IN (SELECT x.item_id FROM jsonb_to_recordset(p_items) AS x(item_id INT, quantity INT))
  )
  ORDER BY ingredient_id
  FOR UPDATE;

  -- 2. Validate each item and compute the total (duplicate item ids are merged).
  FOR v_line IN
    SELECT x.item_id, SUM(x.quantity)::INT AS quantity, bool_or(x.quantity IS NULL OR x.quantity <= 0) AS bad
    FROM jsonb_to_recordset(p_items) AS x(item_id INT, quantity INT)
    GROUP BY x.item_id
    ORDER BY x.item_id
  LOOP
    IF v_line.item_id IS NULL OR v_line.bad THEN
      RAISE EXCEPTION 'every item needs an item_id and a quantity greater than 0';
    END IF;
    SELECT name, price, is_active INTO v_item FROM menu_items WHERE item_id = v_line.item_id;
    IF NOT FOUND OR NOT v_item.is_active THEN
      RAISE EXCEPTION 'item % is not on the menu', v_line.item_id;
    END IF;
    v_avail := servings_available(v_line.item_id);
    IF v_avail < v_line.quantity THEN
      RAISE EXCEPTION 'only % serving(s) of % available, you asked for %', v_avail, v_item.name, v_line.quantity;
    END IF;
    v_total := v_total + v_item.price * v_line.quantity;
  END LOOP;

  -- Wallet: lock and check before changing anything.
  SELECT balance INTO v_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet for user % not found', p_user_id;
  END IF;
  IF v_balance < v_total THEN
    RAISE EXCEPTION 'insufficient wallet balance: order is %, balance is %', v_total, v_balance;
  END IF;

  -- 3. Order and lines (unit_price freezes today's price).
  INSERT INTO orders (user_id, slot_id, status, total_amount)
  VALUES (p_user_id, p_slot_id, 'placed', v_total)
  RETURNING order_id INTO v_order_id;

  INSERT INTO order_items (order_id, item_id, quantity, unit_price)
  SELECT v_order_id, l.item_id, l.quantity, m.price
  FROM (
    SELECT x.item_id, SUM(x.quantity)::INT AS quantity
    FROM jsonb_to_recordset(p_items) AS x(item_id INT, quantity INT)
    GROUP BY x.item_id
  ) l
  JOIN menu_items m ON m.item_id = l.item_id;

  -- 4. Consume stock per ingredient (two items may share an ingredient, so add it up first).
  FOR v_need IN
    SELECT i.ingredient_id, i.name, i.stock_qty, SUM(r.qty_per_serving * l.quantity) AS needed
    FROM (
      SELECT x.item_id, SUM(x.quantity)::INT AS quantity
      FROM jsonb_to_recordset(p_items) AS x(item_id INT, quantity INT)
      GROUP BY x.item_id
    ) l
    JOIN recipe_items r ON r.item_id = l.item_id
    JOIN ingredients i ON i.ingredient_id = r.ingredient_id
    GROUP BY i.ingredient_id, i.name, i.stock_qty
    ORDER BY i.ingredient_id
  LOOP
    IF v_need.needed > v_need.stock_qty THEN
      RAISE EXCEPTION 'not enough % in stock for this order', v_need.name;
    END IF;
    UPDATE ingredients SET stock_qty = stock_qty - v_need.needed WHERE ingredient_id = v_need.ingredient_id;
    INSERT INTO stock_movements (ingredient_id, change_qty, reason, order_id)
    VALUES (v_need.ingredient_id, -v_need.needed, 'order', v_order_id);
  END LOOP;

  -- 5. Pay from the wallet.
  UPDATE wallets SET balance = balance - v_total WHERE user_id = p_user_id;
  INSERT INTO wallet_transactions (user_id, amount, type, order_id, performed_by)
  VALUES (p_user_id, -v_total, 'order', v_order_id, p_user_id);

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_order(p_user_id INT, p_order_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_order  orders%ROWTYPE;
  v_move   RECORD;
BEGIN
  SELECT * INTO v_order FROM orders WHERE order_id = p_order_id FOR UPDATE;
  -- Same message for "missing" and "someone else's" so ids cannot be probed.
  IF NOT FOUND OR v_order.user_id <> p_user_id THEN
    RAISE EXCEPTION 'order % not found', p_order_id;
  END IF;
  IF v_order.status <> 'placed' THEN
    RAISE EXCEPTION 'only orders that are still placed can be cancelled (this one is %)', v_order.status;
  END IF;

  -- Give back exactly what this order consumed (not today's recipe, which may have changed).
  FOR v_move IN
    SELECT ingredient_id, -SUM(change_qty) AS qty
    FROM stock_movements
    WHERE order_id = p_order_id AND reason = 'order'
    GROUP BY ingredient_id
    HAVING -SUM(change_qty) > 0
    ORDER BY ingredient_id
  LOOP
    UPDATE ingredients SET stock_qty = stock_qty + v_move.qty WHERE ingredient_id = v_move.ingredient_id;
    INSERT INTO stock_movements (ingredient_id, change_qty, reason, order_id)
    VALUES (v_move.ingredient_id, v_move.qty, 'cancel', p_order_id);
  END LOOP;

  UPDATE wallets SET balance = balance + v_order.total_amount WHERE user_id = p_user_id;
  INSERT INTO wallet_transactions (user_id, amount, type, order_id, performed_by)
  VALUES (p_user_id, v_order.total_amount, 'refund', p_order_id, p_user_id);

  UPDATE orders SET status = 'cancelled' WHERE order_id = p_order_id;

  RETURN v_order.total_amount;
END;
$$;

CREATE OR REPLACE FUNCTION topup_wallet(p_staff_id INT, p_student_id INT, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_role    user_role;
  v_balance NUMERIC(10,2);
BEGIN
  PERFORM check_staff(p_staff_id);
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'top-up amount must be greater than 0';
  END IF;
  SELECT role INTO v_role FROM users WHERE user_id = p_student_id;
  IF NOT FOUND OR v_role <> 'student' THEN
    RAISE EXCEPTION 'student % not found', p_student_id;
  END IF;

  UPDATE wallets SET balance = balance + p_amount WHERE user_id = p_student_id
  RETURNING balance INTO v_balance;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet for user % not found', p_student_id;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, type, performed_by)
  VALUES (p_student_id, p_amount, 'topup', p_staff_id);

  RETURN v_balance;
END;
$$;
