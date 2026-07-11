import { redirect } from "next/navigation";

import { PortalShell } from "@/components/PortalShell";
import { auth } from "@/lib/auth";
import { homePathForRole, roleFromSession } from "@/lib/roles";

export default async function ProductionLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (role === "po_creator") {
    redirect("/new-order");
  }
  if (role === "gate_guard") {
    redirect("/gate/orders");
  }
  if (role === "dispatch_editor") {
    redirect(homePathForRole(role, username));
  }

  if (role === "batch_editor") {
    return <PortalShell accent="esha">{children}</PortalShell>;
  }

  return children;
}
