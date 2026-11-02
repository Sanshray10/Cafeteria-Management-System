import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorResponse, pool } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200).transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function GET() {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT u.user_id, u.name, u.email, u.role, u.created_at, w.balance::float AS balance
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.user_id
     ORDER BY u.role, u.name`,
  );
  return Response.json({ users: rows, me: user.user_id });
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (user instanceof Response) return user;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Name, a valid email and a password of at least 8 characters are required" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'staff') RETURNING user_id",
      [body.data.name, body.data.email, await bcrypt.hash(body.data.password, 10)],
    );
    return Response.json({ user_id: rows[0].user_id }, { status: 201 });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
