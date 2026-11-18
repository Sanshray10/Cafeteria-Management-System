import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

// Upcoming slots that still have room (next 7 days).
export async function GET() {
  const user = await requireRole("student");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT slot_id, slot_date::text AS slot_date, to_char(start_time, 'HH24:MI') AS start_time,
            capacity, booked, remaining
       FROM v_slot_load
      WHERE remaining > 0
        AND (slot_date + start_time) > localtimestamp
        AND slot_date <= current_date + 7
      ORDER BY slot_date, start_time`,
  );
  return Response.json({ slots: rows });
}
