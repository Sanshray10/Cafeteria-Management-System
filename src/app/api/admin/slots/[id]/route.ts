import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/slots/[id]">) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const id = Number((await ctx.params).id);
  const body = z.object({ capacity: z.number().int().positive().max(1000) }).safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || !body.success) return Response.json({ error: "Capacity must be a positive number" }, { status: 400 });

  try {
    const { rowCount } = await pool.query("UPDATE pickup_slots SET capacity = $2 WHERE slot_id = $1", [id, body.data.capacity]);
    if (rowCount === 0) return Response.json({ error: "Slot not found" }, { status: 404 });
    return Response.json({ slot_id: id });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
