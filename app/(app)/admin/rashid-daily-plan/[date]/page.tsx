import Link from "next/link";
import { notFound } from "next/navigation";

import { RashidDailyPlanView } from "@/components/RashidDailyPlanView";
import { parsePlanDate } from "@/lib/rashidDailyPlan";
import { ui } from "@/lib/ui";

type Props = {
  params: Promise<{ date: string }>;
};

export default async function RashidDailyPlanDatePage({ params }: Props) {
  const { date } = await params;
  if (!parsePlanDate(date)) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/rashid-daily-plan" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← All plans
        </Link>
      </div>
      <div className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Plan — {date}</h1>
        <p className={ui.pageDesc}>Saved factory work plan for this date.</p>
      </div>
      <RashidDailyPlanView planDate={date} />
    </div>
  );
}
