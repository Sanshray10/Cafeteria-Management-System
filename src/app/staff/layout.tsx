import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import StaffNav from "@/components/StaffNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/staff/orders");
  if (user.role !== "staff" && user.role !== "admin") redirect("/menu");

  return (
    <div className="min-h-screen bg-slate-50">
      <StaffNav name={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
