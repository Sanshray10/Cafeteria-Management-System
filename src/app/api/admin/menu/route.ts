import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";
import { embed, menuItemText } from "@/lib/embeddings";

export const runtime = "nodejs";

const schema = z.object({
  category_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  price: z.number().positive().max(999999),
  is_veg: z.boolean(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  is_active: z.boolean().default(true),
});

export async function GET() {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const items = await pool.query(
    `SELECT v.item_id, v.category_id, v.category, v.name, v.description, v.price::float AS price,
            v.is_veg, v.tags, v.is_active, v.servings_available,
            (SELECT COUNT(*)::int FROM recipe_items r WHERE r.item_id = v.item_id) AS recipe_lines
     FROM v_menu_availability v
     ORDER BY v.category, v.name`,
  );
  const categories = await pool.query("SELECT category_id, name FROM categories ORDER BY name");
  return Response.json({ items: items.rows, categories: categories.rows });
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Check the item details", issues: body.error.issues }, { status: 400 });

  const item = body.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO menu_items (category_id, name, description, price, is_veg, tags, is_active, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING item_id`,
      [item.category_id, item.name, item.description, item.price, item.is_veg, item.tags, item.is_active, await embed(menuItemText(item))],
    );
    return Response.json({ item_id: rows[0].item_id }, { status: 201 });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
