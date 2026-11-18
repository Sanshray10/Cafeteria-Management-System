import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiError, badRequest, readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireRole("staff", "admin");
  if (user instanceof Response) return user;

  const { rows } = await pool.query(
    `SELECT u.user_id, u.name, u.email, w.balance::float8 AS balance
       FROM users u JOIN wallets w ON w.user_id = u.user_id
      WHERE u.role = 'student'
      ORDER BY u.name`,
  );
  return Response.json({ students: rows });
}

// Body: { student_id: number, amount: number > 0 }
export async function POST(req: Request) {
  const user = await requireRole("staff", "admin");
  if (user instanceof Response) return user;

  const body = await readJson(req);
  const studentId = Number(body?.student_id);
  const amount = Number(body?.amount);
  if (!Number.isInteger(studentId)) return badRequest("Choose a student");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return badRequest("Amount must be between 0.01 and 10000");

  try {
    const { rows } = await pool.query("SELECT topup_wallet($1, $2, $3)::float8 AS balance", [
      user.user_id,
      studentId,
      amount.toFixed(2),
    ]);
    return Response.json({ student_id: studentId, balance: rows[0].balance });
  } catch (err) {
    return apiError(err);
  }
}
