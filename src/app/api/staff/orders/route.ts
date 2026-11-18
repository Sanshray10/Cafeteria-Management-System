import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

// The kitchen queue: orders that are placed, preparing or ready, earliest slot first.
export async function GET() {
  const user = await requireRole("staff", "admin");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT o.order_id, o.status, o.total_amount::float8 AS total_amount, u.name AS student,
            s.slot_date::text AS slot_date, to_char(s.start_time, 'HH24:MI') AS start_time,
            (SELECT json_agg(json_build_object('name', m.name, 'quantity', oi.quantity) ORDER BY m.name)
               FROM order_items oi JOIN menu_items m ON m.item_id = oi.item_id
              WHERE oi.order_id = o.order_id) AS items
       FROM orders o
       JOIN users u ON u.user_id = o.user_id
       JOIN pickup_slots s ON s.slot_id = o.slot_id
      WHERE o.status IN ('placed', 'preparing', 'ready')
      ORDER BY s.slot_date, s.start_time, o.order_id
      LIMIT 200`,
  );
  return Response.json({ orders: rows });
}
