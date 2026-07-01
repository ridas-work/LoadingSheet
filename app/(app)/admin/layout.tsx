import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { canViewAdminSummary, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canViewAdminSummary(role, username)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  return children;
}
