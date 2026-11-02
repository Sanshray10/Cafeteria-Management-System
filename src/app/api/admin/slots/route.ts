import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  slot_date: z.iso.date(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  capacity: z.number().int().positive().max(1000),
});

export async function GET() {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT s.slot_id, to_char(s.slot_date, 'YYYY-MM-DD') AS slot_date, to_char(s.start_time, 'HH24:MI') AS start_time,
            s.capacity, COUNT(o.order_id) FILTER (WHERE o.status <> 'cancelled')::int AS booked
     FROM pickup_slots s
     LEFT JOIN orders o ON o.slot_id = s.slot_id
     WHERE s.slot_date >= current_date
     GROUP BY s.slot_id
     ORDER BY s.slot_date, s.start_time`,
  );
  return Response.json({ slots: rows });
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "A date, a time (HH:MM) and a positive capacity are required" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      "INSERT INTO pickup_slots (slot_date, start_time, capacity) VALUES ($1, $2, $3) RETURNING slot_id",
      [body.data.slot_date, body.data.start_time, body.data.capacity],
    );
    return Response.json({ slot_id: rows[0].slot_id }, { status: 201 });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
