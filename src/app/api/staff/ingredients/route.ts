import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

// Ingredient list for the restock / wastage dropdowns (the admin list is admin-only).
export async function GET() {
  const user = await requireRole("staff", "admin");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT ingredient_id, name, unit, stock_qty::float8 AS stock_qty, reorder_level::float8 AS reorder_level
       FROM ingredients ORDER BY name`,
  );
  return Response.json({ ingredients: rows });
}
