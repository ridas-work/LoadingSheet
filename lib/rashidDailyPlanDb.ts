import { RashidDailyPlan } from "@/lib/models/RashidDailyPlan";
import { parsePlanDate } from "@/lib/rashidDailyPlan";

export function dayRangeForPlanDate(isoDate: string): { start: Date; end: Date } | null {
  const start = parsePlanDate(isoDate);
  if (!start) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function findRashidDailyPlanByIsoDate(isoDate: string) {
  const range = dayRangeForPlanDate(isoDate);
  if (!range) return null;
  return RashidDailyPlan.findOne({
    planDate: { $gte: range.start, $lt: range.end },
  });
}
