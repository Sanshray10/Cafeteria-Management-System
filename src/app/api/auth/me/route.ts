import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireRole("admin", "staff", "student");
  if (user instanceof Response) return user;
  return Response.json({ user });
}
