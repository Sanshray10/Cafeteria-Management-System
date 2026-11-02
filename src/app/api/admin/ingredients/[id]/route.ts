import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  reorder_level: z.number().min(0).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/ingredients/[id]">) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const id = Number((await ctx.params).id);
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || !body.success) return Response.json({ error: "Check the ingredient details" }, { status: 400 });

  try {
    const { rowCount } = await pool.query(
      "UPDATE ingredients SET name = COALESCE($2, name), reorder_level = COALESCE($3, reorder_level) WHERE ingredient_id = $1",
      [id, body.data.name, body.data.reorder_level],
    );
    if (rowCount === 0) return Response.json({ error: "Ingredient not found" }, { status: 404 });
    return Response.json({ ingredient_id: id });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
