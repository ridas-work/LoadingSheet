import { redirect } from "next/navigation";

import { AdminReportsHub } from "@/components/AdminReportsHub";
import { auth } from "@/lib/auth";
import { canViewAdminReports, roleFromSession } from "@/lib/roles";

export default async function AdminReportsPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canViewAdminReports(role, username)) {
    redirect("/admin");
  }

  return <AdminReportsHub />;
}
