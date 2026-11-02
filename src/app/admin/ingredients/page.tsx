"use client";

import { useEffect, useState } from "react";
import { button, input, send, table } from "../ui";

type Ingredient = {
  ingredient_id: number;
  name: string;
  unit: string;
  stock_qty: number;
  reorder_level: number;
  alert_since: string | null;
  used_in: number;
};

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [levels, setLevels] = useState<Record<number, string>>({});
  const [form, setForm] = useState({ name: "", unit: "g", reorder_level: "" });
  const [error, setError] = useState("");

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    send("GET", "/api/admin/ingredients").then(({ data }) => {
      setIngredients(data.ingredients);
      setLevels({});
    });
  }, [version]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const result = await send("POST", "/api/admin/ingredients", { ...form, reorder_level: Number(form.reorder_level) });
    if (!result.ok) return setError(result.error);
    setForm({ name: "", unit: "g", reorder_level: "" });
    setError("");
    reload();
  }

  async function saveLevel(id: number) {
    const result = await send("PATCH", `/api/admin/ingredients/${id}`, { reorder_level: Number(levels[id]) });
    if (!result.ok) return setError(result.error);
    reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Ingredients</h1>
      <p className="mt-1 text-sm text-stone-500">Stock changes only through staff restock and wastage entries, so every change is recorded.</p>

      <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-4">
        <input required placeholder="New ingredient" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={input}>
          <option value="g">grams (g)</option>
          <option value="ml">millilitres (ml)</option>
          <option value="pcs">pieces (pcs)</option>
        </select>
        <input required type="number" min="0" placeholder="Reorder level" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} className={`${input} w-36`} />
        <button className={button}>Add</button>
        {error && <p className="w-full text-sm text-red-700">{error}</p>}
      </form>

      <table className={`${table} mt-6`}>
        <thead><tr><th>Ingredient</th><th>In stock</th><th>Reorder level</th><th>Used in</th><th>Status</th></tr></thead>
        <tbody>
          {ingredients.map((i) => (
            <tr key={i.ingredient_id}>
              <td>{i.name}</td>
              <td>{i.stock_qty} {i.unit}</td>
              <td>
                <input type="number" min="0" value={levels[i.ingredient_id] ?? i.reorder_level} onChange={(e) => setLevels({ ...levels, [i.ingredient_id]: e.target.value })} className={`${input} w-24`} /> {i.unit}
                {levels[i.ingredient_id] !== undefined && <button onClick={() => saveLevel(i.ingredient_id)} className="ml-2 underline">Save</button>}
              </td>
              <td>{i.used_in} items</td>
              <td>
                {i.alert_since ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">Low since {new Date(i.alert_since).toLocaleDateString()}</span>
                ) : (
                  <span className="text-stone-500">OK</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
