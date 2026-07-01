import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { canViewPackagingInventory, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function PackagingInventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });

  if (!canViewPackagingInventory(role)) {
    redirect(role ? homePathForRole(role) : "/login");
  }

  return children;
}
