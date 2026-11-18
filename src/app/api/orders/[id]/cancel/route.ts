import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiError, badRequest } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: RouteContext<"/api/orders/[id]/cancel">) {
  const user = await requireRole("student");
  if (user instanceof Response) return user;

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) return badRequest("Invalid order id");

  try {
    const { rows } = await pool.query("SELECT cancel_order($1, $2)::float8 AS refunded", [user.user_id, orderId]);
    return Response.json({ refunded: rows[0].refunded });
  } catch (err) {
    return apiError(err);
  }
}
