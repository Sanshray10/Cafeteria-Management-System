"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { btnGhost } from "@/components/ui";

export default function StaffNav({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
        <span className="font-semibold text-slate-900">Kitchen desk</span>
        <Link href="/staff/orders" className="text-slate-700 hover:underline">Orders</Link>
        <Link href="/staff/stock" className="text-slate-700 hover:underline">Stock</Link>
        <Link href="/staff/wallet" className="text-slate-700 hover:underline">Wallet top-up</Link>
        <Link href="/staff/reports" className="text-slate-700 hover:underline">Reports</Link>
        {isAdmin && <Link href="/admin" className="text-slate-700 hover:underline">Admin</Link>}
        <span className="ml-auto text-slate-500">{name}</span>
        <button type="button" className={btnGhost} onClick={logout}>Log out</button>
      </nav>
    </header>
  );
}
