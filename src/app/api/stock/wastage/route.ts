import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  ingredient_id: z.number().int().positive(),
  qty: z.number().positive(),
});

export async function POST(request: Request) {
  const user = await requireRole("staff", "admin");
  if (user instanceof Response) return user;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "ingredient_id and a positive qty are required" }, { status: 400 });

  try {
    const { rows } = await pool.query("SELECT log_wastage($1, $2, $3)::float AS stock_qty", [
      user.user_id,
      body.data.ingredient_id,
      body.data.qty,
    ]);
    return Response.json({ ingredient_id: body.data.ingredient_id, stock_qty: rows[0].stock_qty });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
