"use client";

import { useEffect, useState } from "react";
import { api, rupees } from "@/lib/api-client";
import { card, td, th } from "@/components/ui";

type Reports = {
  revenue: { sale_date: string; category: string; orders: number; items_sold: number; revenue: number }[];
  spenders: { user_id: number; name: string; orders: number; spent: number }[];
  peak: { start_time: string; total_orders: number; avg_load_pct: number }[];
};

function Table({ title, note, head, children }: { title: string; note: string; head: string[]; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="font-medium text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{note}</p>
      </div>
      <div className={`${card} max-h-96 overflow-auto p-0`}>
        <table className="w-full">
          <thead className="sticky top-0 border-b border-slate-200 bg-white">
            <tr>{head.map((h, i) => <th key={h} className={`${th} ${i > 0 && i === head.length - 1 ? "text-right" : ""}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </section>
  );
}

export default function StaffReportsPage() {
  const [data, setData] = useState<Reports | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Reports>("/api/staff/reports").then(setData).catch((e) => setError(e.message));
  }, []);

  if (!data) return <p className="text-slate-600">{error || "Loading…"}</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Sales reports</h1>

      <Table title="Revenue per day per category" note="Picked-up orders, last 14 days." head={["Day", "Category", "Orders", "Items sold", "Revenue"]}>
        {data.revenue.map((r) => (
          <tr key={`${r.sale_date}-${r.category}`}>
            <td className={td}>{r.sale_date}</td><td className={td}>{r.category}</td>
            <td className={td}>{r.orders}</td><td className={td}>{r.items_sold}</td>
            <td className={`${td} text-right tabular-nums`}>{rupees(r.revenue)}</td>
          </tr>
        ))}
      </Table>

      <Table title="Students spending above average" note="Total spent on orders that were not cancelled, compared with the average student." head={["Student", "Orders", "Spent"]}>
        {data.spenders.map((s) => (
          <tr key={s.user_id}>
            <td className={td}>{s.name}</td><td className={td}>{s.orders}</td>
            <td className={`${td} text-right tabular-nums`}>{rupees(s.spent)}</td>
          </tr>
        ))}
      </Table>

      <Table title="Peak pickup times" note="Busiest slot start times across past days." head={["Start time", "Total orders", "Average load"]}>
        {data.peak.map((p) => (
          <tr key={p.start_time}>
            <td className={td}>{p.start_time}</td><td className={td}>{p.total_orders}</td>
            <td className={`${td} text-right tabular-nums`}>{p.avg_load_pct}%</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
