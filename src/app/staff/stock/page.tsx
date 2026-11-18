"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { btn, btnGhost, card, input, td, th } from "@/components/ui";

type Ingredient = { ingredient_id: number; name: string; unit: string; stock_qty: number; reorder_level: number };

export default function StaffStockPage() {
  const [list, setList] = useState<Ingredient[] | null>(null);
  const [id, setId] = useState("");
  const [qty, setQty] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ ingredients: Ingredient[] }>("/api/staff/ingredients");
      setList(d.ingredients);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ingredients");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = list?.find((i) => String(i.ingredient_id) === id);

  async function record(kind: "restock" | "wastage") {
    if (!selected) return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const d = await api<{ stock_qty: number }>(`/api/stock/${kind}`, {
        method: "POST",
        body: JSON.stringify({ ingredient_id: selected.ingredient_id, qty: Number(qty) }),
      });
      setMessage(`${kind === "restock" ? "Restocked" : "Wastage logged for"} ${selected.name}. Stock is now ${d.stock_qty} ${selected.unit}.`);
      setQty("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (!list) return <p className="text-slate-600">{error || "Loading…"}</p>;

  const qtyValid = Number(qty) > 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Stock</h1>
      <div className={`${card} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ingredient
          <select className={input} value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Choose an ingredient</option>
            {list.map((i) => <option key={i.ingredient_id} value={i.ingredient_id}>{i.name} ({i.unit})</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Quantity{selected ? ` in ${selected.unit}` : ""}
          <input className={`${input} w-32`} type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <button type="button" className={btn} disabled={!selected || !qtyValid || busy} onClick={() => record("restock")}>Restock</button>
        <button type="button" className={btnGhost} disabled={!selected || !qtyValid || busy} onClick={() => record("wastage")}>Log wastage</button>
        <div className="w-full" aria-live="polite">
          {message && <p className="text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </div>

      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr><th className={th}>Ingredient</th><th className={`${th} text-right`}>In stock</th><th className={`${th} text-right`}>Reorder level</th><th className={th}>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((i) => {
              const low = i.stock_qty < i.reorder_level;
              return (
                <tr key={i.ingredient_id}>
                  <td className={td}>{i.name}</td>
                  <td className={`${td} text-right tabular-nums`}>{i.stock_qty} {i.unit}</td>
                  <td className={`${td} text-right tabular-nums`}>{i.reorder_level} {i.unit}</td>
                  <td className={`${td} ${low ? "font-medium text-red-700" : "text-slate-500"}`}>{low ? "Low, restock soon" : "OK"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
