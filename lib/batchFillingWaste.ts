import { roundLiters } from "@/lib/batchVolume";

/**
 * Waste / variance (liters unaccounted for):
 *
 *   Nimra remaining − Filled today − Ready to deliver − Physical remaining
 *
 *   0  → books match Rashid’s counts
 *   +  → liquid missing (waste, spill, or count error)
 *   −  → Rashid recorded more than Nimra’s pool (PO sheets may need updating)
 */
export function computeWasteLiters(
  systemRemainingLiters: number,
  filledLitersToday: number,
  readyToDeliverLiters: number,
  physicalRemainingLiters: number,
): number {
  return roundLiters(
    systemRemainingLiters -
      filledLitersToday -
      readyToDeliverLiters -
      physicalRemainingLiters,
  );
}

/** @deprecated Use computeWasteLiters — kept for any legacy two-arg callers */
export function computeVariance(
  systemRemainingLiters: number,
  physicalRemainingLiters: number,
): number {
  return computeWasteLiters(systemRemainingLiters, 0, 0, physicalRemainingLiters);
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
