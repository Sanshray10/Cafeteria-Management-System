// Small fetch wrapper for the pages: returns parsed JSON or throws Error(message from the API).
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const rupees = (n: number | string) => `₹${Number(n).toFixed(2)}`;

export const statusLabel: Record<string, string> = {
  placed: "Placed",
  preparing: "Preparing",
  ready: "Ready for pickup",
  picked_up: "Picked up",
  cancelled: "Cancelled",
};
