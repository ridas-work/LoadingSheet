import Link from "next/link";
import { redirect } from "next/navigation";

import { RashidDailyPlanView } from "@/components/RashidDailyPlanView";
import { auth } from "@/lib/auth";
import { canViewRashidDailyPlan, homePathForRole, roleFromSession } from "@/lib/roles";

type Props = {
  params: Promise<{ date: string }>;
};

export default async function DispatchDailyPlanDatePage({ params }: Props) {
  const { date } = await params;
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canViewRashidDailyPlan(role, username)) {
    redirect(homePathForRole(role ?? "po_creator", username));
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dispatch/daily-plan" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Daily plan
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Plan for {date}</h1>
      </div>
      <RashidDailyPlanView planDate={date} mode="dispatch" />
    </div>
  );
}
