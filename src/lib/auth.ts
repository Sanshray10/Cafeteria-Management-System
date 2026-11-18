import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { pool } from "@/lib/db";

export type SessionUser = {
  user_id: number;
  name: string;
  email: string;
  role: "admin" | "staff" | "student";
};

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "cafeteria_session";
const SESSION_DAYS = 7;

// Only this hash is stored in the database; the raw token lives only in the browser cookie.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await pool.query("DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()", [userId]);
  await pool.query(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(days => $3::int))",
    [userId, hashToken(token), SESSION_DAYS],
  );
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.user_id, u.name, u.email, u.role
       FROM sessions s
       JOIN users u ON u.user_id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return (rows[0] as SessionUser | undefined) ?? null;
}

// Agreed contract (handoff §4.1): returns the user, or a 401 / 403 Response.
export async function requireRole(...roles: SessionUser["role"][]): Promise<SessionUser | Response> {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please log in" }, { status: 401 });
  if (!roles.includes(user.role)) {
    return Response.json({ error: "You do not have access to this" }, { status: 403 });
  }
  return user;
}
