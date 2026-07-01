import { redirect } from "next/navigation";

import { RashidDailyPlanDispatchList } from "@/components/RashidDailyPlanDispatchList";
import { PageHeader } from "@/components/PageHeader";
import { auth } from "@/lib/auth";
import { canViewRashidDailyPlan, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function DispatchDailyPlanPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canViewRashidDailyPlan(role, username)) {
    redirect(homePathForRole(role ?? "po_creator", username));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily plan"
        description="Waleed sets morning targets. Record end-of-day status here — carry-forward rolls to the next day."
      />
      <RashidDailyPlanDispatchList />
    </div>
  );
}
