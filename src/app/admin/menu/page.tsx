"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { button, input, secondaryButton, send, table } from "../ui";

type Item = {
  item_id: number;
  category_id: number;
  category: string;
  name: string;
  description: string;
  price: number;
  is_veg: boolean;
  tags: string[];
  is_active: boolean;
  servings_available: number;
  recipe_lines: number;
};
type Category = { category_id: number; name: string };

const emptyForm = { category_id: 0, name: "", description: "", price: "", is_veg: true, tags: "", is_active: true };

export default function AdminMenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    send("GET", "/api/admin/menu").then(({ data }) => {
      setItems(data.items);
      setCategories(data.categories);
    });
  }, [version]);

  function edit(item: Item) {
    setEditing(item.item_id);
    setError("");
    setForm({ ...item, price: String(item.price), tags: item.tags.join(", ") });
  }

  function reset() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      category_id: Number(form.category_id),
      name: form.name,
      description: form.description,
      is_veg: form.is_veg,
      is_active: form.is_active,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      ...(editing ? {} : { price: Number(form.price) }),
    };
    const result = editing ? await send("PATCH", `/api/admin/menu/${editing}`, body) : await send("POST", "/api/admin/menu", body);
    if (!result.ok) return setError(result.error);
    reset();
    reload();
  }

  async function toggleActive(item: Item) {
    await send("PATCH", `/api/admin/menu/${item.item_id}`, { is_active: !item.is_active });
    reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Menu</h1>

      <form onSubmit={save} className="mt-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{editing ? "Edit item" : "Add item"}</h2>
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        <select required value={form.category_id || ""} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })} className={input}>
          <option value="" disabled>Category</option>
          {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${input} sm:col-span-2`} rows={2} />
        <input placeholder="Tags, comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={input} />
        {editing ? (
          <p className="self-center text-sm text-stone-500">Change the price on the <Link href="/admin/prices" className="underline">Prices</Link> page.</p>
        ) : (
          <input required type="number" min="1" step="0.5" placeholder="Price (₹)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={input} />
        )}
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_veg} onChange={(e) => setForm({ ...form, is_veg: e.target.checked })} /> Veg</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> On the menu</label>
        </div>
        <div className="flex gap-2 sm:justify-end">
          {editing && <button type="button" onClick={reset} className={secondaryButton}>Cancel</button>}
          <button className={button}>{editing ? "Save changes" : "Add item"}</button>
        </div>
        {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      </form>

      <table className={`${table} mt-6`}>
        <thead>
          <tr><th>Item</th><th>Category</th><th>Price</th><th>Can make</th><th>Recipe</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.item_id} className={item.is_active ? "" : "text-stone-400"}>
              <td>
                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${item.is_veg ? "bg-green-600" : "bg-red-600"}`} />
                {item.name}
              </td>
              <td>{item.category}</td>
              <td>₹{item.price}</td>
              <td className={item.servings_available === 0 ? "font-medium text-red-700" : ""}>{item.servings_available}</td>
              <td>
                <Link href={`/admin/recipes?item=${item.item_id}`} className={item.recipe_lines ? "underline" : "font-medium text-red-700 underline"}>
                  {item.recipe_lines ? `${item.recipe_lines} ingredients` : "Missing"}
                </Link>
              </td>
              <td>
                <button onClick={() => toggleActive(item)} className="underline">{item.is_active ? "Active" : "Hidden"}</button>
              </td>
              <td><button onClick={() => edit(item)} className="underline">Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
