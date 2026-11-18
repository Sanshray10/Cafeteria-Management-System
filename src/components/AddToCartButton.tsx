"use client";

import { useCart } from "@/lib/cart";
import { btn } from "@/components/ui";

// Drop this inside ItemCard in src/app/menu/page.tsx:
//   <AddToCartButton item={item} />
export default function AddToCartButton({
  item,
}: {
  item: { item_id: number; name: string; price: number | string; servings_available: number };
}) {
  const { lines, add } = useCart();
  const inCart = lines.find((l) => l.item_id === item.item_id)?.quantity ?? 0;
  const soldOut = item.servings_available <= 0;
  const atLimit = inCart >= item.servings_available;

  return (
    <button
      type="button"
      className={btn}
      disabled={soldOut || atLimit}
      onClick={() => add({ item_id: item.item_id, name: item.name, price: item.price, max: item.servings_available })}
    >
      {soldOut ? "Sold out" : atLimit ? `In cart (${inCart}), no more left` : inCart > 0 ? `Add another (${inCart} in cart)` : "Add to cart"}
    </button>
  );
}
