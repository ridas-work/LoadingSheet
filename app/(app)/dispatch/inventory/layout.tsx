import { redirect } from "next/navigation";

import { PortalShell } from "@/components/PortalShell";
import { auth } from "@/lib/auth";
import { canViewPackagingInventory, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function PackagingInventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canViewPackagingInventory(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  if (role === "batch_editor") {
    return <PortalShell accent="esha">{children}</PortalShell>;
  }

  return children;
}
