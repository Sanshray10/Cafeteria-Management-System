"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { btn, card, input } from "@/components/ui";

type Role = "admin" | "staff" | "student";
const home: Record<Role, string> = { admin: "/admin", staff: "/staff/orders", student: "/menu" };

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = isRegister ? { name, email, password } : { email, password };
      const { user } = await api<{ user: { role: Role } }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Only follow same-site paths from ?next= (no open redirect).
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : home[user.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-slate-900">{isRegister ? "Create your account" : "Log in"}</h1>
      <form onSubmit={submit} className={`${card} flex flex-col gap-3`}>
        {isRegister && (
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Name
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Email
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Password
          <input
            className={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegister ? 8 : undefined}
            maxLength={72}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          {isRegister && <span className="text-xs text-slate-500">8 to 72 characters</span>}
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" className={btn} disabled={busy}>
          {busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        {isRegister ? "Already have an account? " : "New here? "}
        <Link className="font-medium text-emerald-800 underline" href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}
