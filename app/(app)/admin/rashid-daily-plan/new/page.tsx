import Link from "next/link";

import { RashidDailyPlanForm } from "@/components/RashidDailyPlanForm";
import { parsePlanDate, todayPlanDateIso } from "@/lib/rashidDailyPlan";
import { ui } from "@/lib/ui";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function RashidDailyPlanNewPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = params.date?.trim() ?? todayPlanDateIso();
  const initialDate = parsePlanDate(raw) ? raw : todayPlanDateIso();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/rashid-daily-plan" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← All plans
        </Link>
      </div>
      <div className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Morning plan</h1>
        <p className={ui.pageDesc}>
          Set helper of the day, employee duties, and targets. After saving you will go to the plan
          view — record status at end of day from there.
        </p>
      </div>
      <RashidDailyPlanForm
        initialDate={initialDate}
        cancelHref="/admin/rashid-daily-plan"
      />
    </div>
  );
}
