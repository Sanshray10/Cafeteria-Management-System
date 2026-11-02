import { pool } from "@/lib/db";
import { categoryNames } from "@/lib/search";

export const runtime = "nodejs";

export async function GET() {
  const { rows } = await pool.query(
    `SELECT v.item_id, v.name, v.description, v.price::float AS price, v.is_veg, v.tags, v.category,
            v.servings_available, r.avg_rating::float AS avg_rating, r.review_count::int AS review_count
     FROM v_menu_availability v
     JOIN v_item_ratings r ON r.item_id = v.item_id
     WHERE v.is_active
     ORDER BY v.category, v.name`,
  );
  return Response.json({ items: rows, categories: await categoryNames() });
}
