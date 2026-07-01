import Link from "next/link";
import { notFound } from "next/navigation";

import { RashidDailyPlanForm } from "@/components/RashidDailyPlanForm";
import { parsePlanDate } from "@/lib/rashidDailyPlan";
import { ui } from "@/lib/ui";

type Props = {
  params: Promise<{ date: string }>;
};

export default async function RashidDailyPlanEditPage({ params }: Props) {
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
        <h1 className={ui.pageTitle}>Edit morning plan — {date}</h1>
        <p className={ui.pageDesc}>Change targets and duties before end-of-day status is recorded.</p>
      </div>
      <RashidDailyPlanForm
        initialDate={date}
        cancelHref={`/admin/rashid-daily-plan/${date}`}
      />
    </div>
  );
}
