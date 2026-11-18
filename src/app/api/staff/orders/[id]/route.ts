import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiError, badRequest, readJson } from "@/lib/http";

export const runtime = "nodejs";

// Body: { status: "preparing" | "ready" | "picked_up" }
// Cancelling is NOT allowed here: it must go through cancel_order so stock and money are returned.
// The order_status_guard trigger rejects skipped or backwards steps.
export async function PATCH(req: Request, ctx: RouteContext<"/api/staff/orders/[id]">) {
  const user = await requireRole("staff", "admin");
  if (user instanceof Response) return user;

  const { id } = await ctx.params;
  const orderId = Number(id);
  const body = await readJson(req);
  const status = body?.status;
  if (!Number.isInteger(orderId)) return badRequest("Invalid order id");
  if (status !== "preparing" && status !== "ready" && status !== "picked_up") {
    return badRequest("status must be preparing, ready or picked_up");
  }

  try {
    const { rows } = await pool.query(
      "UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING order_id, status",
      [status, orderId],
    );
    if (rows.length === 0) return Response.json({ error: "Order not found" }, { status: 404 });
    return Response.json(rows[0]);
  } catch (err) {
    return apiError(err);
  }
}
