import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  lines: z
    .array(z.object({ ingredient_id: z.number().int().positive(), qty_per_serving: z.number().positive() }))
    .min(1)
    .refine((lines) => new Set(lines.map((l) => l.ingredient_id)).size === lines.length, "Each ingredient can appear once"),
});

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/recipes/[id]">) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT r.ingredient_id, i.name, i.unit, r.qty_per_serving::float AS qty_per_serving,
            i.stock_qty::float AS stock_qty, FLOOR(i.stock_qty / r.qty_per_serving)::int AS servings
     FROM recipe_items r
     JOIN ingredients i ON i.ingredient_id = r.ingredient_id
     WHERE r.item_id = $1
     ORDER BY i.name`,
    [Number((await ctx.params).id)],
  );
  return Response.json({ lines: rows });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/admin/recipes/[id]">) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const id = Number((await ctx.params).id);
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || !body.success) {
    return Response.json({ error: "A recipe needs at least one ingredient, each with a positive quantity" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM recipe_items WHERE item_id = $1", [id]);
    await client.query(
      `INSERT INTO recipe_items (item_id, ingredient_id, qty_per_serving)
       SELECT $1, * FROM unnest($2::int[], $3::numeric[])`,
      [id, body.data.lines.map((l) => l.ingredient_id), body.data.lines.map((l) => l.qty_per_serving)],
    );
    await client.query("COMMIT");
    return Response.json({ item_id: id });
  } catch (err) {
    await client.query("ROLLBACK");
    return dbErrorResponse(err);
  } finally {
    client.release();
  }
}
