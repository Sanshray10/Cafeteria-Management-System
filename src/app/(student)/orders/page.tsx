"use client";

import { useCallback, useEffect, useState } from "react";
import { api, rupees, statusLabel } from "@/lib/api-client";
import { btn, btnDanger, card, input } from "@/components/ui";

type Line = { item_id: number; name: string; quantity: number; unit_price: number; rated: boolean };
type Order = {
  order_id: number;
  status: string;
  total_amount: number;
  slot_date: string;
  start_time: string;
  items: Line[] | null;
};

function RateForm({ orderId, line, onDone }: { orderId: number; line: Line; onDone: () => void }) {
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId, item_id: line.item_id, rating: Number(rating), comment }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your rating");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-2">
      <span className="w-full text-sm text-slate-700">Rate {line.name}</span>
      <select className={input} value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Rating">
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
      </select>
      <input className={`${input} min-w-48 flex-1`} placeholder="Comment (optional)" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      <button type="submit" className={btn} disabled={busy}>Submit rating</button>
      {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState<string | null>(null); // "orderId-itemId" with the form open

  const load = useCallback(async () => {
    try {
      const d = await api<{ orders: Order[] }>("/api/orders");
      setOrders(d.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(id: number) {
    setError("");
    try {
      await api(`/api/orders/${id}/cancel`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    }
  }

  if (!orders) return <p className="text-slate-600">{error || "Loading…"}</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">My orders</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {orders.length === 0 && <p className="text-slate-600">You haven&rsquo;t ordered anything yet.</p>}
      {orders.map((o) => (
        <section key={o.order_id} className={card}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-medium text-slate-900">Order #{o.order_id}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{statusLabel[o.status] ?? o.status}</span>
            <span className="text-sm text-slate-600">Pickup {o.slot_date} at {o.start_time}</span>
            <span className="ml-auto tabular-nums">{rupees(o.total_amount)}</span>
          </div>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {(o.items ?? []).map((l) => {
              const key = `${o.order_id}-${l.item_id}`;
              return (
                <li key={l.item_id} className="py-1.5">
                  <div className="flex items-center gap-3">
                    <span className="flex-1">{l.quantity} × {l.name}</span>
                    <span className="tabular-nums text-slate-600">{rupees(l.unit_price * l.quantity)}</span>
                    {o.status === "picked_up" && (l.rated ? (
                      <span className="text-xs text-slate-500">Rated</span>
                    ) : (
                      <button type="button" className="text-emerald-800 underline" onClick={() => setRating(rating === key ? null : key)}>
                        Rate this item
                      </button>
                    ))}
                  </div>
                  {rating === key && !l.rated && (
                    <RateForm orderId={o.order_id} line={l} onDone={() => { setRating(null); void load(); }} />
                  )}
                </li>
              );
            })}
          </ul>
          {o.status === "placed" && (
            <button type="button" className={`${btnDanger} mt-3`} onClick={() => cancel(o.order_id)}>
              Cancel and refund
            </button>
          )}
        </section>
      ))}
    </div>
  );
}
