import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  unit: z.enum(["g", "ml", "pcs"]),
  reorder_level: z.number().min(0),
});

export async function GET() {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT i.ingredient_id, i.name, i.unit, i.stock_qty::float AS stock_qty, i.reorder_level::float AS reorder_level,
            a.created_at AS alert_since,
            (SELECT COUNT(*)::int FROM recipe_items r WHERE r.ingredient_id = i.ingredient_id) AS used_in
     FROM ingredients i
     LEFT JOIN stock_alerts a ON a.ingredient_id = i.ingredient_id AND a.resolved_at IS NULL
     ORDER BY i.name`,
  );
  return Response.json({ ingredients: rows });
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Name, unit and a reorder level of 0 or more are required" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      "INSERT INTO ingredients (name, unit, reorder_level) VALUES ($1, $2, $3) RETURNING ingredient_id",
      [body.data.name, body.data.unit, body.data.reorder_level],
    );
    return Response.json({ ingredient_id: rows[0].ingredient_id }, { status: 201 });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
