import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">Campus Cafeteria</h1>
      <p className="text-stone-600">Pre-order your food, pay from your wallet and pick it up at your slot.</p>
      <div className="flex gap-3">
        <Link href="/menu" className="rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800">Browse menu</Link>
        <Link href="/admin" className="rounded-lg border border-stone-300 px-4 py-2 hover:bg-stone-100">Admin</Link>
      </div>
    </main>
  );
}
