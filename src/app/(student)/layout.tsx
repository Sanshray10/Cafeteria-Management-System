import StudentNav from "@/components/StudentNav";

// Route group: URLs stay /cart, /orders and /wallet.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <StudentNav />
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
