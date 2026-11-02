import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";
import { embed, menuItemText } from "@/lib/embeddings";

export const runtime = "nodejs";

const schema = z.object({
  category_id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  price: z.number().positive().max(999999).optional(),
  is_veg: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/menu/[id]">) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const id = Number((await ctx.params).id);
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || !body.success) return Response.json({ error: "Check the item details" }, { status: 400 });

  const change = body.data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [String(user.user_id)]);
    const { rows } = await client.query(
      `UPDATE menu_items SET
         category_id = COALESCE($2, category_id),
         name = COALESCE($3, name),
         description = COALESCE($4, description),
         price = COALESCE($5, price),
         is_veg = COALESCE($6, is_veg),
         tags = COALESCE($7, tags),
         is_active = COALESCE($8, is_active),
         updated_at = now()
       WHERE item_id = $1
       RETURNING name, description, tags`,
      [id, change.category_id, change.name, change.description, change.price, change.is_veg, change.tags, change.is_active],
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Item not found" }, { status: 404 });
    }
    if (change.name !== undefined || change.description !== undefined || change.tags !== undefined) {
      await client.query("UPDATE menu_items SET embedding = $2 WHERE item_id = $1", [id, await embed(menuItemText(rows[0]))]);
    }
    await client.query("COMMIT");
    return Response.json({ item_id: id });
  } catch (err) {
    await client.query("ROLLBACK");
    return dbErrorResponse(err);
  } finally {
    client.release();
  }
}
