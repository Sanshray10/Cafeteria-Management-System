import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export function dbErrorResponse(err: unknown) {
  const { code, message } = err as { code?: string; message: string };
  if (code === "23505") return Response.json({ error: "That already exists" }, { status: 409 });
  if (code === "P0001" || code?.startsWith("23")) return Response.json({ error: message }, { status: 400 });
  throw err;
}
