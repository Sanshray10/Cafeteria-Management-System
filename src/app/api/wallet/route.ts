import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireRole("student");
  if (user instanceof Response) return user;

  const [wallet, txns] = await Promise.all([
    pool.query("SELECT balance::float8 AS balance FROM wallets WHERE user_id = $1", [user.user_id]),
    pool.query(
      `SELECT txn_id, amount::float8 AS amount, type, order_id, created_at
         FROM wallet_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC, txn_id DESC
        LIMIT 50`,
      [user.user_id],
    ),
  ]);
  return Response.json({ balance: wallet.rows[0]?.balance ?? 0, transactions: txns.rows });
}
