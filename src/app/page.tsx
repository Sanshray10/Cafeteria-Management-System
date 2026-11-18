import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

// Landing page = login redirect.
export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.role === "admin" ? "/admin" : user.role === "staff" ? "/staff/orders" : "/menu");
}
