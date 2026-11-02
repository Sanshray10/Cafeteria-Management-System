"use client";

import { useEffect, useState } from "react";
import { table } from "../ui";

type Reports = {
  low_rated: { item_id: number; name: string; avg_rating: number; reviews: number }[];
  usage: { week: string; name: string; unit: string; consumed: number; wasted: number }[];
  popular: { item_id: number; name: string; category: string; order_count: number; total_quantity: number; total_revenue: number }[];
  low_stock: { ingredient_id: number; name: string; unit: string; stock_qty: number; reorder_level: number; shortage: number; alert_since: string | null }[];
};

export default function ReportsPage() {
  const [data, setData] = useState<Reports | null>(null);
  const [week, setWeek] = useState("");

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((res) => res.json())
      .then((d: Reports) => {
        setData(d);
        setWeek(d.usage[0]?.week ?? "");
      });
  }, []);

  if (!data) return <p>Loading…</p>;
  const weeks = [...new Set(data.usage.map((u) => u.week))];

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <section>
        <h2 className="text-lg font-semibold">Poorly rated items</h2>
        <p className="mb-2 text-sm text-stone-500">Average rating below 3 with at least 5 reviews.</p>
        <table className={table}>
          <thead><tr><th>Item</th><th>Average rating</th><th>Reviews</th></tr></thead>
          <tbody>
            {data.low_rated.map((r) => (
              <tr key={r.item_id}><td>{r.name}</td><td>★ {r.avg_rating.toFixed(2)}</td><td>{r.reviews}</td></tr>
            ))}
          </tbody>
        </table>
        {data.low_rated.length === 0 && <p className="text-sm text-stone-500">No items match.</p>}
      </section>

      <section>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Ingredient consumption vs wastage</h2>
          <select value={week} onChange={(e) => setWeek(e.target.value)} className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm">
            {weeks.map((w) => <option key={w} value={w}>Week of {w}</option>)}
          </select>
        </div>
        <table className={`${table} mt-2`}>
          <thead><tr><th>Ingredient</th><th>Consumed by orders</th><th>Wasted</th><th>Wastage share</th></tr></thead>
          <tbody>
            {data.usage.filter((u) => u.week === week).map((u) => {
              const share = u.consumed + u.wasted > 0 ? (u.wasted / (u.consumed + u.wasted)) * 100 : 0;
              return (
                <tr key={u.name}>
                  <td>{u.name}</td>
                  <td>{u.consumed} {u.unit}</td>
                  <td>{u.wasted} {u.unit}</td>
                  <td className={share > 20 ? "font-medium text-red-700" : ""}>{share.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Most popular items</h2>
        <table className={table}>
          <thead><tr><th>Item</th><th>Category</th><th>Orders</th><th>Quantity sold</th><th>Revenue</th></tr></thead>
          <tbody>
            {data.popular.map((p) => (
              <tr key={p.item_id}><td>{p.name}</td><td>{p.category}</td><td>{p.order_count}</td><td>{p.total_quantity}</td><td>₹{p.total_revenue}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Low stock</h2>
        <table className={table}>
          <thead><tr><th>Ingredient</th><th>In stock</th><th>Reorder level</th><th>Short by</th><th>Alert open since</th></tr></thead>
          <tbody>
            {data.low_stock.map((s) => (
              <tr key={s.ingredient_id}>
                <td>{s.name}</td>
                <td>{s.stock_qty} {s.unit}</td>
                <td>{s.reorder_level} {s.unit}</td>
                <td className="text-red-700">{s.shortage} {s.unit}</td>
                <td>{s.alert_since ? new Date(s.alert_since).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.low_stock.length === 0 && <p className="text-sm text-stone-500">Everything is above its reorder level.</p>}
      </section>
    </div>
  );
}
