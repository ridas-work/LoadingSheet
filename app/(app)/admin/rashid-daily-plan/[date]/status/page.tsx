import Link from "next/link";
import { notFound } from "next/navigation";

import { RashidDailyPlanStatusForm } from "@/components/RashidDailyPlanStatusForm";
import { parsePlanDate } from "@/lib/rashidDailyPlan";
import { ui } from "@/lib/ui";

type Props = {
  params: Promise<{ date: string }>;
};

export default async function RashidDailyPlanStatusPage({ params }: Props) {
  const { date } = await params;
  if (!parsePlanDate(date)) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/admin/rashid-daily-plan/${date}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Plan view
        </Link>
      </div>
      <div className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>End-of-day status — {date}</h1>
        <p className={ui.pageDesc}>
          Enter what each person achieved. Carry-forward is calculated and saved for the next
          day&apos;s plan.
        </p>
      </div>
      <RashidDailyPlanStatusForm planDate={date} />
    </div>
  );
}
