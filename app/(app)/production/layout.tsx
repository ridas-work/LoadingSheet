import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { roleFromSession } from "@/lib/roles";

export default async function ProductionLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (role === "po_creator") {
    redirect("/new-order");
  }
  if (role === "dispatch_editor") {
    redirect("/orders");
  }
  return children;
}
