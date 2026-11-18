"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, rupees } from "@/lib/api-client";
import { useCart } from "@/lib/cart";
import { btn, btnGhost, card, input } from "@/components/ui";

type Slot = { slot_id: number; slot_date: string; start_time: string; remaining: number };

export default function CartPage() {
  const router = useRouter();
  const { lines, total, setQuantity, clear } = useCart();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    api<{ slots: Slot[] }>("/api/slots").then((d) => setSlots(d.slots)).catch((e) => setError(e.message));
    api<{ balance: number }>("/api/wallet").then((d) => setBalance(d.balance)).catch(() => {});
  }, []);

  const short = balance !== null && total > balance;

  async function place() {
    setError("");
    setPlacing(true);
    try {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          slot_id: Number(slotId),
          items: lines.map((l) => ({ item_id: l.item_id, quantity: l.quantity })),
        }),
      });
      clear();
      router.push("/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place the order");
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className={card}>
        <p className="text-slate-700">Your cart is empty.</p>
        <Link href="/menu" className="mt-2 inline-block text-sm font-medium text-emerald-800 underline">Browse the menu</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Your cart</h1>
      <ul className={`${card} divide-y divide-slate-100`}>
        {lines.map((l) => (
          <li key={l.item_id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <span className="flex-1 text-slate-900">{l.name}</span>
            <span className="text-sm text-slate-600">{rupees(l.price)} each</span>
            <div className="flex items-center gap-2">
              <button type="button" className={btnGhost} aria-label={`Fewer ${l.name}`} onClick={() => setQuantity(l.item_id, l.quantity - 1)}>−</button>
              <span className="w-6 text-center tabular-nums">{l.quantity}</span>
              <button type="button" className={btnGhost} aria-label={`More ${l.name}`} disabled={l.quantity >= l.max} onClick={() => setQuantity(l.item_id, l.quantity + 1)}>+</button>
            </div>
            <span className="w-20 text-right tabular-nums">{rupees(l.price * l.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className={`${card} flex flex-col gap-3`}>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Pickup slot
          <select className={input} value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            <option value="">Choose a slot</option>
            {slots.map((s) => (
              <option key={s.slot_id} value={s.slot_id}>
                {s.slot_date} at {s.start_time} ({s.remaining} left)
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-slate-700">
          Total <strong className="tabular-nums">{rupees(total)}</strong>
          {balance !== null && <> · Wallet balance <span className="tabular-nums">{rupees(balance)}</span></>}
        </p>
        {short && <p role="alert" className="text-sm text-red-700">Your wallet balance is too low. Ask the cafeteria staff to top it up.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className={btn} disabled={!slotId || short || placing} onClick={place}>
            {placing ? "Placing order…" : `Pay ${rupees(total)} and place order`}
          </button>
          <button type="button" className={btnGhost} onClick={clear}>Empty cart</button>
        </div>
      </div>
    </div>
  );
}
