-- DROP + CREATE so the file can be edited and re-created while developing.
DROP VIEW IF EXISTS v_daily_sales;
CREATE VIEW v_daily_sales AS
SELECT s.slot_date                          AS sale_date,
       c.name                               AS category,
       COUNT(DISTINCT o.order_id)::INT      AS orders,
       SUM(oi.quantity)::INT                AS items_sold,
       SUM(oi.quantity * oi.unit_price)     AS revenue
FROM orders o
JOIN pickup_slots s ON s.slot_id = o.slot_id
JOIN order_items oi ON oi.order_id = o.order_id
JOIN menu_items m   ON m.item_id = oi.item_id
JOIN categories c   ON c.category_id = m.category_id
WHERE o.status = 'picked_up'            -- revenue counts only food that was collected
GROUP BY s.slot_date, c.name;

DROP VIEW IF EXISTS v_slot_load;
CREATE VIEW v_slot_load AS
SELECT s.slot_id,
       s.slot_date,
       s.start_time,
       s.capacity,
       COUNT(o.order_id)::INT                                AS booked,
       (s.capacity - COUNT(o.order_id))::INT                 AS remaining,
       ROUND(100.0 * COUNT(o.order_id) / s.capacity, 1)      AS load_pct
FROM pickup_slots s
LEFT JOIN orders o ON o.slot_id = s.slot_id AND o.status <> 'cancelled'
GROUP BY s.slot_id;
