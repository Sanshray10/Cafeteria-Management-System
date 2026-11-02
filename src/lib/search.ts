import { pool } from "@/lib/db";
import { embed } from "@/lib/embeddings";
import type { SearchFilters } from "@/lib/llm";

export async function semanticSearch(filters: SearchFilters) {
  const vector = await embed(filters.semantic_query);
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT v.item_id, v.name, v.description, v.price::float AS price, v.is_veg, v.tags, v.category,
              v.servings_available, r.avg_rating::float AS avg_rating, r.review_count::int AS review_count,
              m.embedding <=> $1 AS distance
       FROM v_menu_availability v
       JOIN menu_items m ON m.item_id = v.item_id
       JOIN v_item_ratings r ON r.item_id = v.item_id
       WHERE v.is_active
         AND v.servings_available > 0
         AND m.embedding IS NOT NULL
         AND ($2::numeric IS NULL OR v.price <= $2)
         AND ($3::numeric IS NULL OR v.price >= $3)
         AND ($4::boolean IS NULL OR v.is_veg = $4)
         AND ($5::text IS NULL OR v.category = $5)
       ORDER BY m.embedding <=> $1
       LIMIT 10
     ) nearest
     ORDER BY CASE WHEN $6 = 'price_asc' THEN price END ASC,
              CASE WHEN $6 = 'price_desc' THEN price END DESC,
              distance`,
    [
      vector,
      filters.max_price ?? null,
      filters.min_price ?? null,
      filters.is_veg ?? null,
      filters.category ?? null,
      filters.sort ?? "relevance",
    ],
  );
  return rows;
}

export async function keywordSearch(text: string) {
  const { rows } = await pool.query(
    `SELECT v.item_id, v.name, v.description, v.price::float AS price, v.is_veg, v.tags, v.category,
            v.servings_available, r.avg_rating::float AS avg_rating, r.review_count::int AS review_count,
            ts_rank(m.search_tsv, q) AS rank
     FROM v_menu_availability v
     JOIN menu_items m ON m.item_id = v.item_id
     JOIN v_item_ratings r ON r.item_id = v.item_id,
          websearch_to_tsquery('english', $1) q
     WHERE m.search_tsv @@ q
       AND v.is_active
       AND v.servings_available > 0
     ORDER BY rank DESC
     LIMIT 10`,
    [text],
  );
  return rows;
}

export async function categoryNames(): Promise<string[]> {
  const { rows } = await pool.query("SELECT name FROM categories ORDER BY name");
  return rows.map((r) => r.name);
}
