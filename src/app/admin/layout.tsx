import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import StaffNav from "@/components/StaffNav";

const links = [
  ["Reports", "/admin/reports"],
  ["Menu", "/admin/menu"],
  ["Recipes", "/admin/recipes"],
  ["Ingredients", "/admin/ingredients"],
  ["Prices", "/admin/prices"],
  ["Slots", "/admin/slots"],
  ["Users", "/admin/users"],
  ["Feedback", "/admin/feedback"],
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect(user.role === "staff" ? "/staff/orders" : "/menu");

  return (
    <>
      <StaffNav name={user.name} isAdmin />
      <div className="flex flex-1 flex-col sm:flex-row">
        <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 bg-white p-3 sm:w-48 sm:flex-col sm:border-b-0 sm:border-r">
          <p className="mb-2 hidden px-2 font-semibold sm:block">Admin</p>
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-2 py-1.5 text-sm hover:bg-stone-100">
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </>
  );
}
