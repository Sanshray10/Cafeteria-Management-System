"use client";

import { useEffect, useState } from "react";
import { button, input, send, table } from "../ui";

type User = { user_id: number; name: string; email: string; role: string; created_at: string; balance: number | null };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    send("GET", "/api/admin/users").then(({ data }) => {
      setUsers(data.users);
      setMe(data.me);
    });
  }, [version]);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    const result = await send("POST", "/api/admin/users", form);
    if (!result.ok) return setError(result.error);
    setForm({ name: "", email: "", password: "" });
    setError("");
    reload();
  }

  async function changeRole(id: number, role: string) {
    const result = await send("PATCH", `/api/admin/users/${id}`, { role });
    setError(result.error);
    reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>

      <form onSubmit={addStaff} className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-4">
        <span className="font-semibold">New staff account</span>
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
        <input required type="password" minLength={8} placeholder="Password (8+ characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
        <button className={button}>Create</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <table className={`${table} mt-6`}>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Wallet</th><th>Joined</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.user_id}>
              <td>{u.name}{u.user_id === me && <span className="ml-2 text-stone-400">(you)</span>}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} disabled={u.user_id === me} onChange={(e) => changeRole(u.user_id, e.target.value)} className={input}>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>₹{u.balance ?? 0}</td>
              <td>{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
