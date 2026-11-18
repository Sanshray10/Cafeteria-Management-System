"use client";

import { useEffect, useState } from "react";
import { api, rupees } from "@/lib/api-client";
import { card, td, th } from "@/components/ui";

type Txn = { txn_id: number; amount: number; type: "topup" | "order" | "refund"; order_id: number | null; created_at: string };

const label = { topup: "Top-up", order: "Order payment", refund: "Refund" };

export default function WalletPage() {
  const [data, setData] = useState<{ balance: number; transactions: Txn[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ balance: number; transactions: Txn[] }>("/api/wallet").then(setData).catch((e) => setError(e.message));
  }, []);

  if (!data) return <p className="text-slate-600">{error || "Loading…"}</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Wallet</h1>
      <div className={card}>
        <p className="text-sm text-slate-600">Balance</p>
        <p className="text-3xl font-semibold tabular-nums text-slate-900">{rupees(data.balance)}</p>
        <p className="mt-1 text-sm text-slate-600">To add money, pay at the cafeteria counter and a staff member will top up your wallet.</p>
      </div>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr><th className={th}>When</th><th className={th}>Type</th><th className={th}>Order</th><th className={`${th} text-right`}>Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.transactions.map((t) => (
              <tr key={t.txn_id}>
                <td className={td}>{new Date(t.created_at).toLocaleString("en-IN")}</td>
                <td className={td}>{label[t.type]}</td>
                <td className={td}>{t.order_id ? `#${t.order_id}` : "–"}</td>
                <td className={`${td} text-right tabular-nums ${t.amount < 0 ? "text-red-700" : "text-emerald-800"}`}>
                  {t.amount < 0 ? "−" : "+"}{rupees(Math.abs(t.amount))}
                </td>
              </tr>
            ))}
            {data.transactions.length === 0 && <tr><td className={td} colSpan={4}>No transactions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
