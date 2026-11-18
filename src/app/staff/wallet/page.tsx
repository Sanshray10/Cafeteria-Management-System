"use client";

import { useCallback, useEffect, useState } from "react";
import { api, rupees } from "@/lib/api-client";
import { btn, card, input, td, th } from "@/components/ui";

type Student = { user_id: number; name: string; email: string; balance: number };

export default function StaffWalletPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ students: Student[] }>("/api/staff/wallet");
      setStudents(d.students);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load students");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function topUp() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const d = await api<{ balance: number }>("/api/staff/wallet", {
        method: "POST",
        body: JSON.stringify({ student_id: Number(studentId), amount: Number(amount) }),
      });
      const who = students?.find((s) => String(s.user_id) === studentId)?.name ?? "the student";
      setMessage(`Added ${rupees(amount)} for ${who}. New balance ${rupees(d.balance)}.`);
      setAmount("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not top up");
    } finally {
      setBusy(false);
    }
  }

  if (!students) return <p className="text-slate-600">{error || "Loading…"}</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Wallet top-up</h1>
      <div className={`${card} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Student
          <select className={input} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Choose a student</option>
            {students.map((s) => <option key={s.user_id} value={s.user_id}>{s.name} ({s.email})</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Amount received (₹)
          <input className={`${input} w-32`} type="number" min="1" max="10000" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button type="button" className={btn} disabled={!studentId || !(Number(amount) > 0) || busy} onClick={topUp}>Add to wallet</button>
        <div className="w-full" aria-live="polite">
          {message && <p className="text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </div>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr><th className={th}>Student</th><th className={th}>Email</th><th className={`${th} text-right`}>Balance</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.user_id}>
                <td className={td}>{s.name}</td><td className={td}>{s.email}</td>
                <td className={`${td} text-right tabular-nums`}>{rupees(s.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
