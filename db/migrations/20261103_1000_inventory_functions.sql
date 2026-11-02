CREATE FUNCTION servings_available(p_item_id INT) RETURNS INT
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(MIN(FLOOR(i.stock_qty / r.qty_per_serving))::INT, 0)
    FROM recipe_items r
    JOIN ingredients i ON i.ingredient_id = r.ingredient_id
    WHERE r.item_id = p_item_id
$$;

CREATE FUNCTION check_staff(p_staff_id INT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_staff_id AND role IN ('staff', 'admin')) THEN
        RAISE EXCEPTION 'user % is not staff', p_staff_id;
    END IF;
END
$$;

CREATE FUNCTION restock_ingredient(p_staff_id INT, p_ingredient_id INT, p_qty NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
    v_stock NUMERIC;
BEGIN
    IF p_qty IS NULL OR p_qty <= 0 THEN
        RAISE EXCEPTION 'quantity must be greater than 0';
    END IF;
    PERFORM check_staff(p_staff_id);

    UPDATE ingredients SET stock_qty = stock_qty + p_qty
    WHERE ingredient_id = p_ingredient_id
    RETURNING stock_qty INTO v_stock;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ingredient % not found', p_ingredient_id;
    END IF;

    INSERT INTO stock_movements (ingredient_id, change_qty, reason, staff_id)
    VALUES (p_ingredient_id, p_qty, 'restock', p_staff_id);
    RETURN v_stock;
END
$$;

CREATE FUNCTION log_wastage(p_staff_id INT, p_ingredient_id INT, p_qty NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
    v_stock NUMERIC;
BEGIN
    IF p_qty IS NULL OR p_qty <= 0 THEN
        RAISE EXCEPTION 'quantity must be greater than 0';
    END IF;
    PERFORM check_staff(p_staff_id);

    SELECT stock_qty INTO v_stock FROM ingredients
    WHERE ingredient_id = p_ingredient_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ingredient % not found', p_ingredient_id;
    END IF;
    IF v_stock < p_qty THEN
        RAISE EXCEPTION 'cannot waste % when only % is in stock', p_qty, v_stock;
    END IF;

    UPDATE ingredients SET stock_qty = stock_qty - p_qty
    WHERE ingredient_id = p_ingredient_id
    RETURNING stock_qty INTO v_stock;

    INSERT INTO stock_movements (ingredient_id, change_qty, reason, staff_id)
    VALUES (p_ingredient_id, -p_qty, 'wastage', p_staff_id);
    RETURN v_stock;
END
$$;
