import { redirect } from "next/navigation";

import { MarketVisitAlertReportPanel } from "@/components/MarketVisitAlertReportPanel";
import { auth } from "@/lib/auth";
import { canViewAdminReports, roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

export default async function AdminMarketVisitAlertsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!canViewAdminReports(role, username)) redirect("/admin");

  return (
    <div className="space-y-4">
      <header className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Market visit availability</h1>
        <p className={ui.pageDesc}>
          Same availability grid as Aslam and Ahtisham use on market visits. Filter by store name to see
          all rows for that customer (e.g. al fatah). Red cells = out of stock (N).
        </p>
      </header>
      <div className="px-4">
        <MarketVisitAlertReportPanel />
      </div>
    </div>
  );
}
