// Turns database rule violations into clean JSON errors.
// (Same behaviour as dbErrorResponse in Sanshray's db.ts; kept separate so this branch builds on its own.)
export function apiError(err: unknown): Response {
  const e = err as { code?: string; message?: string };
  if (e?.code === "23505") {
    return Response.json({ error: "That already exists" }, { status: 409 });
  }
  if (e?.code === "P0001" || (typeof e?.code === "string" && e.code.startsWith("23"))) {
    return Response.json({ error: e.message ?? "Request rejected" }, { status: 400 });
  }
  throw err;
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
