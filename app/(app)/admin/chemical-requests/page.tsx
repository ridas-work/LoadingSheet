import { redirect } from "next/navigation";

import { AdminChemicalRequestsTable } from "@/components/AdminChemicalRequestsTable";
import { auth } from "@/lib/auth";
import { homePathForRole, isAdmin, roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

export default async function AdminChemicalRequestsPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!isAdmin(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  return (
    <div className="space-y-6">
      <header className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Chemical material requests</h1>
        <p className={ui.pageDesc}>
          Ramazan&apos;s re-order requests. Approve, then mark ordered once purchased.
        </p>
      </header>
      <AdminChemicalRequestsTable />
    </div>
  );
}
