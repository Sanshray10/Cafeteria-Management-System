import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const [lowRated, usage, popular, lowStock] = await Promise.all([
    pool.query(
      `SELECT m.item_id, m.name, ROUND(AVG(f.rating), 2)::float AS avg_rating, COUNT(*)::int AS reviews
       FROM feedback f
       JOIN menu_items m ON m.item_id = f.item_id
       GROUP BY m.item_id, m.name
       HAVING AVG(f.rating) < 3 AND COUNT(*) >= 5
       ORDER BY avg_rating`,
    ),
    pool.query(
      `SELECT to_char(date_trunc('week', sm.created_at), 'YYYY-MM-DD') AS week, i.name, i.unit,
              COALESCE(-SUM(sm.change_qty) FILTER (WHERE sm.reason IN ('order', 'cancel')), 0)::float AS consumed,
              COALESCE(-SUM(sm.change_qty) FILTER (WHERE sm.reason = 'wastage'), 0)::float AS wasted
       FROM stock_movements sm
       JOIN ingredients i ON i.ingredient_id = sm.ingredient_id
       WHERE sm.reason IN ('order', 'cancel', 'wastage')
         AND sm.created_at >= date_trunc('week', now()) - interval '5 weeks'
       GROUP BY 1, i.ingredient_id, i.name, i.unit
       ORDER BY week DESC, i.name`,
    ),
    pool.query(
      `SELECT item_id, name, category, order_count::int, total_quantity::int, total_revenue::float
       FROM v_popular_items
       ORDER BY total_quantity DESC
       LIMIT 10`,
    ),
    pool.query(
      `SELECT ingredient_id, name, unit, stock_qty::float, reorder_level::float, shortage::float, alert_since
       FROM v_low_stock
       ORDER BY shortage DESC`,
    ),
  ]);

  return Response.json({
    low_rated: lowRated.rows,
    usage: usage.rows,
    popular: popular.rows,
    low_stock: lowStock.rows,
  });
}
