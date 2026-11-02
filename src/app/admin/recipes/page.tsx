"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { button, input, secondaryButton, send, table } from "../ui";

type Item = { item_id: number; name: string; servings_available: number };
type Ingredient = { ingredient_id: number; name: string; unit: string; stock_qty: number };
type Line = { ingredient_id: number; qty_per_serving: string };

export default function RecipesPage() {
  return (
    <Suspense>
      <RecipeEditor />
    </Suspense>
  );
}

function RecipeEditor() {
  const [items, setItems] = useState<Item[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [itemId, setItemId] = useState(Number(useSearchParams().get("item")) || 0);
  const [lines, setLines] = useState<Line[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    send("GET", "/api/admin/menu").then(({ data }) => setItems(data.items));
    send("GET", "/api/admin/ingredients").then(({ data }) => setIngredients(data.ingredients));
  }, []);

  useEffect(() => {
    if (!itemId) return;
    send("GET", `/api/admin/recipes/${itemId}`).then(({ data }) => {
      setLines(data.lines.map((l: { ingredient_id: number; qty_per_serving: number }) => ({ ingredient_id: l.ingredient_id, qty_per_serving: String(l.qty_per_serving) })));
      setMessage("");
    });
  }, [itemId]);

  function update(index: number, change: Partial<Line>) {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...change } : l)));
  }

  async function save() {
    const result = await send("PUT", `/api/admin/recipes/${itemId}`, {
      lines: lines.map((l) => ({ ingredient_id: l.ingredient_id, qty_per_serving: Number(l.qty_per_serving) })),
    });
    if (!result.ok) return setMessage(result.error);
    const { data } = await send("GET", "/api/admin/menu");
    setItems(data.items);
    setMessage("Recipe saved.");
  }

  const item = items.find((i) => i.item_id === itemId);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Recipes</h1>
      <select value={itemId || ""} onChange={(e) => setItemId(Number(e.target.value))} className={`${input} mt-4`}>
        <option value="" disabled>Choose a menu item</option>
        {items.map((i) => <option key={i.item_id} value={i.item_id}>{i.name}</option>)}
      </select>

      {item && (
        <div className="mt-4 max-w-2xl">
          <p className="text-sm text-stone-600">
            One serving of <b>{item.name}</b> uses the ingredients below. With current stock the kitchen can make <b>{item.servings_available}</b> servings.
          </p>
          <table className={`${table} mt-3`}>
            <thead><tr><th>Ingredient</th><th>Per serving</th><th>In stock</th><th>Servings</th><th /></tr></thead>
            <tbody>
              {lines.map((line, index) => {
                const ingredient = ingredients.find((i) => i.ingredient_id === line.ingredient_id);
                const qty = Number(line.qty_per_serving);
                return (
                  <tr key={index}>
                    <td>
                      <select value={line.ingredient_id || ""} onChange={(e) => update(index, { ingredient_id: Number(e.target.value) })} className={input}>
                        <option value="" disabled>Choose</option>
                        {ingredients.map((i) => <option key={i.ingredient_id} value={i.ingredient_id}>{i.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="number" min="0.01" step="0.01" value={line.qty_per_serving} onChange={(e) => update(index, { qty_per_serving: e.target.value })} className={`${input} w-24`} /> {ingredient?.unit}
                    </td>
                    <td>{ingredient ? `${ingredient.stock_qty} ${ingredient.unit}` : ""}</td>
                    <td>{ingredient && qty > 0 ? Math.floor(ingredient.stock_qty / qty) : ""}</td>
                    <td><button onClick={() => setLines(lines.filter((_, i) => i !== index))} className="text-red-700 underline">Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setLines([...lines, { ingredient_id: 0, qty_per_serving: "" }])} className={secondaryButton}>Add ingredient</button>
            <button onClick={save} className={button}>Save recipe</button>
          </div>
          {message && <p className="mt-2 text-sm">{message}</p>}
        </div>
      )}
    </div>
  );
}
