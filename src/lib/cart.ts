"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type CartLine = { item_id: number; name: string; price: number; quantity: number; max: number };

const KEY = "cafeteria_cart";

function subscribe(cb: () => void) {
  window.addEventListener("cart-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("cart-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

function snapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function save(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable: cart just won't persist */
  }
  window.dispatchEvent(new Event("cart-changed"));
}

function parse(raw: string): CartLine[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function useCart() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const lines = useMemo(() => parse(raw), [raw]);

  const add = useCallback((item: { item_id: number; name: string; price: number | string; max: number }) => {
    const current = parse(snapshot());
    const existing = current.find((l) => l.item_id === item.item_id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + 1, Math.max(item.max, 1));
      existing.max = item.max;
    } else {
      current.push({ item_id: item.item_id, name: item.name, price: Number(item.price), quantity: 1, max: item.max });
    }
    save(current);
  }, []);

  const setQuantity = useCallback((itemId: number, quantity: number) => {
    const current = parse(snapshot())
      .map((l) => (l.item_id === itemId ? { ...l, quantity: Math.min(quantity, l.max) } : l))
      .filter((l) => l.quantity > 0);
    save(current);
  }, []);

  const clear = useCallback(() => save([]), []);

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  return { lines, count, total, add, setQuantity, clear };
}
