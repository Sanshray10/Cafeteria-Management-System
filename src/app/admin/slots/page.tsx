"use client";

import { useEffect, useState } from "react";
import { button, input, send, table } from "../ui";

type Slot = { slot_id: number; slot_date: string; start_time: string; capacity: number; booked: number };

export default function SlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [capacities, setCapacities] = useState<Record<number, string>>({});
  const [form, setForm] = useState({ slot_date: "", start_time: "", capacity: "40" });
  const [error, setError] = useState("");

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    send("GET", "/api/admin/slots").then(({ data }) => {
      setSlots(data.slots);
      setCapacities({});
    });
  }, [version]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const result = await send("POST", "/api/admin/slots", { ...form, capacity: Number(form.capacity) });
    if (!result.ok) return setError(result.error);
    setError("");
    reload();
  }

  async function saveCapacity(id: number) {
    const result = await send("PATCH", `/api/admin/slots/${id}`, { capacity: Number(capacities[id]) });
    if (!result.ok) return setError(result.error);
    setError("");
    reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Pickup slots</h1>

      <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-4">
        <input required type="date" value={form.slot_date} onChange={(e) => setForm({ ...form, slot_date: e.target.value })} className={input} />
        <input required type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={input} />
        <input required type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={`${input} w-24`} />
        <button className={button}>Add slot</button>
        {error && <p className="w-full text-sm text-red-700">{error}</p>}
      </form>

      <table className={`${table} mt-6 max-w-2xl`}>
        <thead><tr><th>Date</th><th>Time</th><th>Booked</th><th>Capacity</th></tr></thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.slot_id}>
              <td>{new Date(s.slot_date + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</td>
              <td>{s.start_time}</td>
              <td className={s.booked >= s.capacity ? "font-medium text-red-700" : ""}>{s.booked}</td>
              <td>
                <input type="number" min="1" value={capacities[s.slot_id] ?? s.capacity} onChange={(e) => setCapacities({ ...capacities, [s.slot_id]: e.target.value })} className={`${input} w-20`} />
                {capacities[s.slot_id] !== undefined && <button onClick={() => saveCapacity(s.slot_id)} className="ml-2 underline">Save</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
