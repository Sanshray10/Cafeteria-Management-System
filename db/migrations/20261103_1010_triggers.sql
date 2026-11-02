CREATE FUNCTION trg_low_stock() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.stock_qty < NEW.reorder_level THEN
        INSERT INTO stock_alerts (ingredient_id) VALUES (NEW.ingredient_id)
        ON CONFLICT (ingredient_id) WHERE resolved_at IS NULL DO NOTHING;
    ELSE
        UPDATE stock_alerts SET resolved_at = now()
        WHERE ingredient_id = NEW.ingredient_id AND resolved_at IS NULL;
    END IF;
    RETURN NULL;
END
$$;

CREATE TRIGGER low_stock_alert
AFTER UPDATE OF stock_qty, reorder_level ON ingredients
FOR EACH ROW EXECUTE FUNCTION trg_low_stock();

-- the API sets app.user_id with set_config(..., true) in the same transaction
CREATE FUNCTION trg_price_audit() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO price_history (item_id, old_price, new_price, changed_by)
    VALUES (NEW.item_id, OLD.price, NEW.price,
            NULLIF(current_setting('app.user_id', true), '')::INT);
    RETURN NEW;
END
$$;

CREATE TRIGGER price_audit
BEFORE UPDATE OF price ON menu_items
FOR EACH ROW WHEN (OLD.price IS DISTINCT FROM NEW.price)
EXECUTE FUNCTION trg_price_audit();

CREATE FUNCTION trg_feedback_guard() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM orders o
        JOIN order_items oi ON oi.order_id = o.order_id
        WHERE o.order_id = NEW.order_id
          AND o.user_id = NEW.user_id
          AND o.status = 'picked_up'
          AND oi.item_id = NEW.item_id
    ) THEN
        RAISE EXCEPTION 'feedback is only allowed on items from your own picked-up orders';
    END IF;
    RETURN NEW;
END
$$;

CREATE TRIGGER feedback_guard
BEFORE INSERT OR UPDATE OF order_id, item_id, user_id ON feedback
FOR EACH ROW EXECUTE FUNCTION trg_feedback_guard();

CREATE FUNCTION trg_create_wallet() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO wallets (user_id) VALUES (NEW.user_id);
    RETURN NULL;
END
$$;

CREATE TRIGGER create_wallet
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION trg_create_wallet();

ALTER TABLE feedback ADD CONSTRAINT feedback_comment_length CHECK (length(comment) <= 1000);
