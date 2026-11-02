CREATE VIEW v_menu_availability AS
SELECT m.item_id, m.name, m.description, m.price, m.is_veg, m.tags, m.is_active,
       m.category_id, c.name AS category,
       servings_available(m.item_id) AS servings_available
FROM menu_items m
JOIN categories c ON c.category_id = m.category_id;

CREATE VIEW v_popular_items AS
SELECT m.item_id, m.name, c.name AS category,
       COUNT(DISTINCT o.order_id) AS order_count,
       SUM(oi.quantity) AS total_quantity,
       SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
JOIN menu_items m ON m.item_id = oi.item_id
JOIN categories c ON c.category_id = m.category_id
WHERE o.status <> 'cancelled'
GROUP BY m.item_id, m.name, c.name;

CREATE VIEW v_low_stock AS
SELECT i.ingredient_id, i.name, i.unit, i.stock_qty, i.reorder_level,
       i.reorder_level - i.stock_qty AS shortage,
       a.created_at AS alert_since
FROM ingredients i
LEFT JOIN stock_alerts a ON a.ingredient_id = i.ingredient_id AND a.resolved_at IS NULL
WHERE i.stock_qty < i.reorder_level;

CREATE VIEW v_item_ratings AS
SELECT m.item_id, m.name,
       ROUND(AVG(f.rating), 2) AS avg_rating,
       COUNT(f.feedback_id) AS review_count
FROM menu_items m
LEFT JOIN feedback f ON f.item_id = m.item_id
GROUP BY m.item_id, m.name;
