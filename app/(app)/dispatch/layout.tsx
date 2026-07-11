import { redirect } from "next/navigation";

import { PortalShell } from "@/components/PortalShell";
import { auth } from "@/lib/auth";
import {
  adminCanViewOperations,
  canViewAdminSummary,
  canViewPackagingInventory,
  homePathForRole,
  isDispatchBatchOperator,
  roleFromSession,
} from "@/lib/roles";

export default async function DispatchLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (role === "gate_guard") {
    redirect("/gate/orders");
  }
  if (
    role !== "dispatch_editor" &&
    !adminCanViewOperations(role) &&
    !canViewPackagingInventory(role) &&
    !canViewAdminSummary(role, username)
  ) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  const showRashidPortal = isDispatchBatchOperator(role, username) && role !== "admin";

  if (showRashidPortal) {
    return <PortalShell accent="rashid" showArt={false}>{children}</PortalShell>;
  }

  return children;
}
