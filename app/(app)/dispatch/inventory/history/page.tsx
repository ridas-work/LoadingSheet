import { redirect } from "next/navigation";

import { PackagingInventoryHistory } from "@/components/PackagingInventoryHistory";
import { auth } from "@/lib/auth";
import { canViewPackagingInventory, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function PackagingInventoryHistoryPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canViewPackagingInventory(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  return <PackagingInventoryHistory accentEsha={role === "batch_editor"} />;
}
