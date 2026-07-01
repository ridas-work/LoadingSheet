import { redirect } from "next/navigation";

import { AdminReportsHub } from "@/components/AdminReportsHub";
import { auth } from "@/lib/auth";
import { canViewAdminReports, roleFromSession } from "@/lib/roles";

export default async function AdminReportsPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (!canViewAdminReports(role)) {
    redirect("/admin");
  }

  return <AdminReportsHub />;
}
