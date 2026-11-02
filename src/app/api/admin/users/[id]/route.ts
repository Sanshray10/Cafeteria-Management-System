import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const id = Number((await ctx.params).id);
  const body = z.object({ role: z.enum(["admin", "staff", "student"]) }).safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || !body.success) return Response.json({ error: "Role must be admin, staff or student" }, { status: 400 });
  if (id === user.user_id) return Response.json({ error: "You cannot change your own role" }, { status: 400 });

  const { rowCount } = await pool.query("UPDATE users SET role = $2 WHERE user_id = $1", [id, body.data.role]);
  if (rowCount === 0) return Response.json({ error: "User not found" }, { status: 404 });
  return Response.json({ user_id: id, role: body.data.role });
}
