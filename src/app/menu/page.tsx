"use client";

import { useEffect, useState } from "react";

type Item = {
  item_id: number;
  name: string;
  description: string;
  price: number;
  is_veg: boolean;
  tags: string[];
  category: string;
  servings_available: number;
  avg_rating: number | null;
  review_count: number;
};

type Filters = {
  semantic_query: string;
  max_price?: number;
  min_price?: number;
  is_veg?: boolean;
  category?: string;
  sort?: "relevance" | "price_asc" | "price_desc";
};

const sortLabels = { relevance: "Best match", price_asc: "Cheapest first", price_desc: "Priciest first" };

export default function MenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters | null>(null);
  const [results, setResults] = useState<Item[]>([]);
  const [keywordResults, setKeywordResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items);
        setCategories(data.categories);
      });
  }, []);

  async function search(withFilters?: Filters) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, filters: withFilters }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setFilters(data.filters);
    setResults(data.results);
    setKeywordResults(data.keyword_results);
  }

  function updateFilter(change: Partial<Filters>) {
    const next = { ...filters!, ...change };
    for (const key of Object.keys(change) as (keyof Filters)[]) {
      if (next[key] === undefined || Number.isNaN(next[key])) delete next[key];
    }
    setFilters(next);
  }

  function clearSearch() {
    setQuery("");
    setFilters(null);
    setResults([]);
    setKeywordResults([]);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Menu</h1>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={200}
          placeholder="Try “something cold under 50” or “spicy veg lunch”"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2"
        />
        <button disabled={loading || !query.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">
          {loading ? "Searching…" : "Search"}
        </button>
        {filters && (
          <button type="button" onClick={clearSearch} className="rounded-lg border border-stone-300 px-4 py-2">
            Clear
          </button>
        )}
      </form>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      {filters && (
        <div className="mt-4 rounded-lg border border-stone-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-stone-500">Searching for</span>
            <Chip>
              <input
                value={filters.semantic_query}
                onChange={(e) => updateFilter({ semantic_query: e.target.value })}
                className="w-40 bg-transparent outline-none"
              />
            </Chip>
            {filters.category !== undefined && (
              <Chip onRemove={() => updateFilter({ category: undefined })}>
                <select value={filters.category} onChange={(e) => updateFilter({ category: e.target.value })} className="bg-transparent">
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Chip>
            )}
            {filters.is_veg !== undefined && (
              <Chip onRemove={() => updateFilter({ is_veg: undefined })}>
                <select value={String(filters.is_veg)} onChange={(e) => updateFilter({ is_veg: e.target.value === "true" })} className="bg-transparent">
                  <option value="true">Veg</option>
                  <option value="false">Non-veg</option>
                </select>
              </Chip>
            )}
            {filters.min_price !== undefined && (
              <Chip onRemove={() => updateFilter({ min_price: undefined })}>
                from ₹
                <input type="number" min={1} value={filters.min_price} onChange={(e) => updateFilter({ min_price: e.target.valueAsNumber })} className="w-14 bg-transparent outline-none" />
              </Chip>
            )}
            {filters.max_price !== undefined && (
              <Chip onRemove={() => updateFilter({ max_price: undefined })}>
                up to ₹
                <input type="number" min={1} value={filters.max_price} onChange={(e) => updateFilter({ max_price: e.target.valueAsNumber })} className="w-14 bg-transparent outline-none" />
              </Chip>
            )}
            {filters.sort !== undefined && (
              <Chip onRemove={() => updateFilter({ sort: undefined })}>
                <select value={filters.sort} onChange={(e) => updateFilter({ sort: e.target.value as Filters["sort"] })} className="bg-transparent">
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Chip>
            )}
            <select
              value=""
              onChange={(e) => {
                const defaults: Partial<Filters> = { category: categories[0], is_veg: true, min_price: 20, max_price: 100, sort: "price_asc" };
                const key = e.target.value as keyof Filters;
                updateFilter({ [key]: defaults[key] });
              }}
              className="rounded-full border border-dashed border-stone-300 px-2 py-1 text-stone-500"
            >
              <option value="">+ Add filter</option>
              {filters.category === undefined && <option value="category">Category</option>}
              {filters.is_veg === undefined && <option value="is_veg">Veg / non-veg</option>}
              {filters.min_price === undefined && <option value="min_price">Min price</option>}
              {filters.max_price === undefined && <option value="max_price">Max price</option>}
              {filters.sort === undefined && <option value="sort">Sort</option>}
            </select>
            <button
              onClick={() => search(filters)}
              disabled={loading || !filters.semantic_query.trim()}
              className="ml-auto rounded-lg bg-stone-800 px-3 py-1 text-white disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {filters ? (
        <>
          <Section title="Best matches" items={results} empty="Nothing available matches these filters." />
          <Section title="Keyword matches" items={keywordResults} empty="No items contain these exact words." />
        </>
      ) : (
        categories
          .filter((c) => items.some((i) => i.category === c))
          .map((c) => <Section key={c} title={c} items={items.filter((i) => i.category === c)} empty="" />)
      )}
    </main>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-900 ring-1 ring-emerald-200">
      {children}
      {onRemove && (
        <button onClick={onRemove} aria-label="Remove filter" className="ml-1 text-emerald-700 hover:text-emerald-950">
          ×
        </button>
      )}
    </span>
  );
}

function Section({ title, items, empty }: { title: string; items: Item[]; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.item_id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function ItemCard({ item }: { item: Item }) {
  const soldOut = item.servings_available === 0;
  return (
    <div className={`rounded-lg border border-stone-200 bg-white p-4 ${soldOut ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">
          <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${item.is_veg ? "bg-green-600" : "bg-red-600"}`} title={item.is_veg ? "Veg" : "Non-veg"} />
          {item.name}
        </h3>
        <span className="font-semibold">₹{item.price}</span>
      </div>
      <p className="mt-1 text-sm text-stone-600">{item.description}</p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-stone-600">
          {item.review_count > 0 ? `★ ${item.avg_rating?.toFixed(1)} (${item.review_count})` : "No reviews yet"}
        </span>
        {soldOut ? <span className="font-medium text-red-700">Sold out</span> : <span className="text-stone-500">{item.category}</span>}
      </div>
    </div>
  );
}
