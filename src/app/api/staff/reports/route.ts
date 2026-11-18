import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireRole("staff", "admin");
  if (user instanceof Response) return user;

  const [revenue, spenders, peak] = await Promise.all([
    // 1. Revenue per day per category (view), last 14 days.
    pool.query(
      `SELECT sale_date::text AS sale_date, category, orders, items_sold, revenue::float8 AS revenue
         FROM v_daily_sales
        WHERE sale_date >= current_date - 14
        ORDER BY sale_date DESC, revenue DESC`,
    ),
    // 2. Students who spent more than the average student (subquery in HAVING).
    pool.query(
      `SELECT u.user_id, u.name, COUNT(*)::int AS orders, SUM(o.total_amount)::float8 AS spent
         FROM users u
         JOIN orders o ON o.user_id = u.user_id
        WHERE u.role = 'student' AND o.status <> 'cancelled'
        GROUP BY u.user_id, u.name
       HAVING SUM(o.total_amount) > (
                SELECT AVG(t.spent)
                  FROM (SELECT SUM(o2.total_amount) AS spent
                          FROM orders o2
                          JOIN users u2 ON u2.user_id = o2.user_id
                         WHERE u2.role = 'student' AND o2.status <> 'cancelled'
                         GROUP BY o2.user_id) t)
        ORDER BY spent DESC`,
    ),
    // 3. Peak pickup times: busiest start times across all days (view).
    pool.query(
      `SELECT to_char(start_time, 'HH24:MI') AS start_time,
              SUM(booked)::int AS total_orders,
              ROUND(AVG(load_pct), 1)::float8 AS avg_load_pct
         FROM v_slot_load
        WHERE slot_date < current_date
        GROUP BY start_time
        ORDER BY total_orders DESC`,
    ),
  ]);

  return Response.json({ revenue: revenue.rows, spenders: spenders.rows, peak: peak.rows });
}
