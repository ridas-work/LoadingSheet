import { redirect } from "next/navigation";

import { PortalShell } from "@/components/PortalShell";
import { auth } from "@/lib/auth";
import { homePathForRole, isDispatchTripPlanner, isRashidDispatchUser, roleFromSession } from "@/lib/roles";

export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (role === "batch_editor") {
    redirect("/production/batches");
  }
  if (role === "gate_guard") {
    redirect("/gate/orders");
  }
  if (isRashidDispatchUser(role, username)) {
    redirect(homePathForRole(role ?? "dispatch_editor", username));
  }

  const showAliPortal = isDispatchTripPlanner(role, username) && role !== "admin";

  if (showAliPortal) {
    return <PortalShell accent="ali">{children}</PortalShell>;
  }

  return children;
}
