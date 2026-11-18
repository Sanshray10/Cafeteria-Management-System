import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { apiError, badRequest, readJson } from "@/lib/http";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await readJson(req);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (name.length < 1 || name.length > 100) return badRequest("Enter your name (up to 100 characters)");
  if (!EMAIL.test(email) || email.length > 200) return badRequest("Enter a valid email address");
  if (password.length < 8 || password.length > 72) return badRequest("Password must be 8 to 72 characters");

  try {
    const hash = await bcrypt.hash(password, 10);
    // No wallet insert: the create_wallet trigger does it. Role defaults to 'student'.
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, email, role",
      [name, email, hash],
    );
    await createSession(rows[0].user_id);
    return Response.json({ user: rows[0] }, { status: 201 });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "23505") return Response.json({ error: "An account with that email already exists" }, { status: 409 });
    return apiError(err);
  }
}
