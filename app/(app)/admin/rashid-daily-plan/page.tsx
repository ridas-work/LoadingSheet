import Link from "next/link";

import { RashidDailyPlanList } from "@/components/RashidDailyPlanList";
import { ui } from "@/lib/ui";

export default function RashidDailyPlanPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Admin summary
        </Link>
      </div>
      <div className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Rashid daily plan</h1>
        <p className={ui.pageDesc}>
          Morning: save targets and duties for the factory. End of day: open the plan and record
          status achieved and carry-forward on a separate screen.
        </p>
      </div>
      <RashidDailyPlanList />
    </div>
  );
}
