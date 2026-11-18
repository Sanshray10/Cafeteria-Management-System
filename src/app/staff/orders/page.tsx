"use client";

import { useCallback, useEffect, useState } from "react";
import { api, rupees, statusLabel } from "@/lib/api-client";
import { btn, card } from "@/components/ui";

type Order = {
  order_id: number;
  status: "placed" | "preparing" | "ready";
  total_amount: number;
  student: string;
  slot_date: string;
  start_time: string;
  items: { name: string; quantity: number }[] | null;
};

const next = {
  placed: { status: "preparing", label: "Start preparing" },
  preparing: { status: "ready", label: "Mark ready" },
  ready: { status: "picked_up", label: "Mark picked up" },
} as const;

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ orders: Order[] }>("/api/staff/orders");
      setOrders(d.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [load]);

  async function advance(o: Order) {
    setError("");
    try {
      await api(`/api/staff/orders/${o.order_id}`, { method: "PATCH", body: JSON.stringify({ status: next[o.status].status }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the order");
    }
  }

  if (!orders) return <p className="text-slate-600">{error || "Loading…"}</p>;

  // Group by pickup slot.
  const groups = new Map<string, Order[]>();
  for (const o of orders) {
    const key = `${o.slot_date} at ${o.start_time}`;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900">Order queue</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {groups.size === 0 && <p className="text-slate-600">No open orders. The queue refreshes every 20 seconds.</p>}
      {[...groups].map(([slot, list]) => (
        <section key={slot} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-700">{slot} · {list.length} order{list.length > 1 ? "s" : ""}</h2>
          {list.map((o) => (
            <div key={o.order_id} className={`${card} flex flex-wrap items-center gap-3`}>
              <div className="min-w-40">
                <p className="font-medium text-slate-900">#{o.order_id} · {o.student}</p>
                <p className="text-xs text-slate-500">{statusLabel[o.status]} · {rupees(o.total_amount)}</p>
              </div>
              <p className="flex-1 text-sm text-slate-700">{(o.items ?? []).map((i) => `${i.quantity} × ${i.name}`).join(", ")}</p>
              <button type="button" className={btn} onClick={() => advance(o)}>{next[o.status].label}</button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
