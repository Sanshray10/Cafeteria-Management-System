import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";
import { embed } from "@/lib/embeddings";

export const runtime = "nodejs";

const schema = z.object({
  order_id: z.number().int().positive(),
  item_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(""),
});

export async function POST(request: Request) {
  const user = await requireRole("student");
  if (user instanceof Response) return user;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "order_id, item_id and a rating from 1 to 5 are required" }, { status: 400 });

  const { order_id, item_id, rating, comment } = body.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO feedback (order_id, item_id, user_id, rating, comment, embedding)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING feedback_id`,
      [order_id, item_id, user.user_id, rating, comment, comment ? await embed(comment) : null],
    );
    return Response.json({ feedback_id: rows[0].feedback_id }, { status: 201 });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
