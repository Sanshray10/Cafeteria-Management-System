import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiError, badRequest, readJson } from "@/lib/http";

export const runtime = "nodejs";

// The student's own orders, newest first, with lines and whether each line was already rated.
export async function GET() {
  const user = await requireRole("student");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT o.order_id, o.status, o.total_amount::float8 AS total_amount, o.created_at,
            s.slot_date::text AS slot_date, to_char(s.start_time, 'HH24:MI') AS start_time,
            (SELECT json_agg(json_build_object(
                      'item_id', oi.item_id, 'name', m.name, 'quantity', oi.quantity,
                      'unit_price', oi.unit_price::float8,
                      'rated', EXISTS (SELECT 1 FROM feedback f WHERE f.order_id = oi.order_id AND f.item_id = oi.item_id))
                    ORDER BY m.name)
               FROM order_items oi JOIN menu_items m ON m.item_id = oi.item_id
              WHERE oi.order_id = o.order_id) AS items
       FROM orders o
       JOIN pickup_slots s ON s.slot_id = o.slot_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC, o.order_id DESC
      LIMIT 50`,
    [user.user_id],
  );
  return Response.json({ orders: rows });
}

// Body: { slot_id: number, items: [{ item_id: number, quantity: number }] }
export async function POST(req: Request) {
  const user = await requireRole("student");
  if (user instanceof Response) return user;

  const body = await readJson(req);
  const slotId = Number(body?.slot_id);
  const items = body?.items;
  if (!Number.isInteger(slotId)) return badRequest("Choose a pickup slot");
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) return badRequest("Add at least one item");
  for (const it of items as { item_id?: unknown; quantity?: unknown }[]) {
    if (!Number.isInteger(it?.item_id) || !Number.isInteger(it?.quantity) || (it.quantity as number) < 1 || (it.quantity as number) > 50) {
      return badRequest("Each item needs an item_id and a quantity from 1 to 50");
    }
  }

  try {
    const { rows } = await pool.query("SELECT place_order($1, $2, $3::jsonb) AS order_id", [
      user.user_id,
      slotId,
      JSON.stringify(items),
    ]);
    return Response.json({ order_id: rows[0].order_id }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
