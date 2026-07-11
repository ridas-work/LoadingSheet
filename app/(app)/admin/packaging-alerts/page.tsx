import { redirect } from "next/navigation";

import { PackagingReorderAlertsPanel } from "@/components/PackagingReorderAlertsPanel";
import { auth } from "@/lib/auth";
import { canViewPackagingAlerts, roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

export default async function PackagingAlertsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!canViewPackagingAlerts(role, username)) redirect("/admin");

  return (
    <div className="space-y-4">
      <header className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Packaging reorder alerts</h1>
        <p className={ui.pageDesc}>
          Low-stock warnings when packaging components drop below minimum levels for production continuity.
        </p>
      </header>
      <div className="px-4">
        <PackagingReorderAlertsPanel />
      </div>
    </div>
  );
}
