export const input = "rounded-md border border-stone-300 bg-white px-2 py-1";
export const button = "rounded-md bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800 disabled:opacity-50";
export const secondaryButton = "rounded-md border border-stone-300 bg-white px-3 py-1 hover:bg-stone-100";
export const table = "w-full border-collapse text-sm [&_td]:border-t [&_td]:border-stone-200 [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-stone-500";

export async function send(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data, error: res.ok ? "" : (data.error as string) };
}
