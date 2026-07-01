import Link from "next/link";
import { redirect } from "next/navigation";

import { RashidDailyPlanStatusForm } from "@/components/RashidDailyPlanStatusForm";
import { auth } from "@/lib/auth";
import {
  canRecordRashidDailyPlanStatus,
  homePathForRole,
  roleFromSession,
} from "@/lib/roles";

type Props = {
  params: Promise<{ date: string }>;
};

export default async function DispatchDailyPlanStatusPage({ params }: Props) {
  const { date } = await params;
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canRecordRashidDailyPlanStatus(role, username)) {
    redirect(homePathForRole(role ?? "po_creator", username));
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dispatch/daily-plan/${date}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to plan
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">End-of-day status — {date}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Enter how much each person achieved. Shortfall carries forward to tomorrow.
        </p>
      </div>
      <RashidDailyPlanStatusForm
        planDate={date}
        apiBase="/api/dispatch/daily-plan"
        redirectBase="/dispatch/daily-plan"
        showAdminLinks={false}
      />
    </div>
  );
}
