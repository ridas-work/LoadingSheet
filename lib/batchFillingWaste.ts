import { roundLiters } from "@/lib/batchVolume";

/**
 * Variance (waste indicator):
 *   positive → system thinks more liquid remains than Rashid measured (spillage / unlogged use)
 *   negative → Rashid measured more than system expects (unassigned fill or sheet not updated)
 */
export function computeVariance(
  systemRemainingLiters: number,
  physicalRemainingLiters: number,
): number {
  return roundLiters(systemRemainingLiters - physicalRemainingLiters);
}

export function parseNonNegativeLiters(
  value: unknown,
  field: string,
): number | { error: string } {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { error: `${field} must be a number ≥ 0` };
  }
  return roundLiters(n);
}

/** Today's date as "YYYY-MM-DD" (UTC). */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
