import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT p.id, m.name AS item, p.old_price::float AS old_price, p.new_price::float AS new_price,
            u.name AS changed_by, p.changed_at
     FROM price_history p
     JOIN menu_items m ON m.item_id = p.item_id
     LEFT JOIN users u ON u.user_id = p.changed_by
     ORDER BY p.changed_at DESC
     LIMIT 100`,
  );
  return Response.json({ history: rows });
}
