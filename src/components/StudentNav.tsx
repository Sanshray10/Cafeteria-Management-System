"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useCart } from "@/lib/cart";
import { btnGhost } from "@/components/ui";

export default function StudentNav() {
  const router = useRouter();
  const { count } = useCart();
  const [name, setName] = useState("");

  useEffect(() => {
    api<{ user: { name: string } }>("/api/auth/me")
      .then((d) => setName(d.user.name))
      .catch(() => {});
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
        <Link href="/menu" className="font-semibold text-slate-900">Campus Cafeteria</Link>
        <Link href="/menu" className="text-slate-700 hover:underline">Menu</Link>
        <Link href="/cart" className="text-slate-700 hover:underline">Cart{count > 0 ? ` (${count})` : ""}</Link>
        <Link href="/orders" className="text-slate-700 hover:underline">My orders</Link>
        <Link href="/wallet" className="text-slate-700 hover:underline">Wallet</Link>
        <span className="ml-auto text-slate-500">{name}</span>
        <button type="button" className={btnGhost} onClick={logout}>Log out</button>
      </nav>
    </header>
  );
}
