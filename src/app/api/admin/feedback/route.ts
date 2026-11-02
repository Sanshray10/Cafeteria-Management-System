import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/db";
import { embed } from "@/lib/embeddings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const params = new URL(request.url).searchParams;
  const text = params.get("q")?.trim().slice(0, 200);
  const feedbackId = Number(params.get("feedback_id"));

  if (text || feedbackId) {
    const vector = text
      ? await embed(text)
      : (await pool.query("SELECT embedding::text FROM feedback WHERE feedback_id = $1", [feedbackId])).rows[0]?.embedding;
    if (!vector) return Response.json({ error: "That feedback has no comment to compare" }, { status: 400 });

    const { rows } = await pool.query(
      `WITH nearest AS (
         SELECT f.comment, f.rating, f.item_id, f.embedding <=> $1 AS distance
         FROM feedback f
         WHERE f.embedding IS NOT NULL AND f.feedback_id <> $2
         ORDER BY f.embedding <=> $1
         LIMIT 200
       )
       SELECT n.comment, COUNT(*)::int AS times, ROUND(AVG(n.rating), 1)::float AS avg_rating,
              string_agg(DISTINCT m.name, ', ') AS items, ROUND(MIN(n.distance)::numeric, 3)::float AS distance
       FROM nearest n
       JOIN menu_items m ON m.item_id = n.item_id
       GROUP BY n.comment
       ORDER BY distance
       LIMIT 10`,
      [vector, feedbackId || 0],
    );
    return Response.json({ similar: rows });
  }

  const [ratings, recent] = await Promise.all([
    pool.query(
      `SELECT item_id, name, avg_rating::float, review_count::int
       FROM v_item_ratings
       WHERE review_count > 0
       ORDER BY avg_rating, review_count DESC`,
    ),
    pool.query(
      `SELECT f.feedback_id, m.name AS item, f.rating, f.comment, f.created_at
       FROM feedback f
       JOIN menu_items m ON m.item_id = f.item_id
       WHERE f.comment <> '' AND f.rating <= 2
       ORDER BY f.created_at DESC
       LIMIT 30`,
    ),
  ]);
  return Response.json({ ratings: ratings.rows, recent_complaints: recent.rows });
}
