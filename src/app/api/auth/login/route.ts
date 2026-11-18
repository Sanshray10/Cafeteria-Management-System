import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/http";

export const runtime = "nodejs";

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return badRequest("Enter your email and password");

  const { rows } = await pool.query(
    "SELECT user_id, name, email, role, password_hash FROM users WHERE lower(email) = $1",
    [email],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.user_id);
  return Response.json({ user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
}
