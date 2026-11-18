-- Order status transitions and updated_at.
-- Both are BEFORE UPDATE, so the seed's direct INSERTs of picked_up/cancelled orders still work.

CREATE OR REPLACE FUNCTION order_status_guard() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT (
       (OLD.status = 'placed'    AND NEW.status IN ('preparing', 'cancelled'))
    OR (OLD.status = 'preparing' AND NEW.status = 'ready')
    OR (OLD.status = 'ready'     AND NEW.status = 'picked_up')
  ) THEN
    RAISE EXCEPTION 'an order cannot go from % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_status_guard ON orders;
CREATE TRIGGER order_status_guard
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION order_status_guard();

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
