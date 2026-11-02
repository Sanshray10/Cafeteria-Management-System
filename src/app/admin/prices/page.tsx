"use client";

import { useEffect, useState } from "react";
import { send, table, input } from "../ui";

type Item = { item_id: number; name: string; category: string; price: number };
type Change = { id: number; item: string; old_price: number; new_price: number; changed_by: string | null; changed_at: string };

export default function PricesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<Change[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    Promise.all([send("GET", "/api/admin/menu"), send("GET", "/api/admin/prices")]).then(([menu, changes]) => {
      setItems(menu.data.items);
      setHistory(changes.data.history);
      setPrices({});
    });
  }, [version]);

  async function save(id: number) {
    const result = await send("PATCH", `/api/admin/menu/${id}`, { price: Number(prices[id]) });
    if (!result.ok) return setError(result.error);
    setError("");
    reload();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h1 className="text-2xl font-semibold">Prices</h1>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <table className={`${table} mt-4`}>
          <thead><tr><th>Item</th><th>Category</th><th>Price (₹)</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.item_id}>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>
                  <input type="number" min="1" step="0.5" value={prices[item.item_id] ?? item.price} onChange={(e) => setPrices({ ...prices, [item.item_id]: e.target.value })} className={`${input} w-24`} />
                  {prices[item.item_id] !== undefined && <button onClick={() => save(item.item_id)} className="ml-2 underline">Save</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Price history</h2>
        <p className="text-sm text-stone-500">Recorded automatically by a database trigger on every price change.</p>
        <table className={`${table} mt-4`}>
          <thead><tr><th>When</th><th>Item</th><th>Change</th><th>By</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.changed_at).toLocaleString()}</td>
                <td>{h.item}</td>
                <td>₹{h.old_price} → ₹{h.new_price}</td>
                <td>{h.changed_by ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
