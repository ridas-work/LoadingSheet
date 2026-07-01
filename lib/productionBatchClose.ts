import { roundLiters } from "@/lib/batchVolume";
import { normalizeQcOutcome } from "@/lib/productionBatchQc";

const WASTE_EPSILON = 0.001;

export function isBatchClosed(batch: { closedAt?: Date | string | null } | null | undefined): boolean {
  return batch?.closedAt != null;
}

/** Active batches Esha can still edit or assign to dispatch. */
export function openProductionBatchMongoFilter(): Record<string, unknown> {
  return { $or: [{ closedAt: null }, { closedAt: { $exists: false } }] };
}

export function closedProductionBatchMongoFilter(): Record<string, unknown> {
  return { closedAt: { $ne: null } };
}

export function mergeOpenBatchFilter(
  base: Record<string, unknown>,
): Record<string, unknown> {
  const open = openProductionBatchMongoFilter();
  return { $and: [base, open] };
}

export type BatchCloseValidationInput = {
  batch: { qcOutcome?: unknown; closedAt?: Date | string | null };
  remainingLiters: number;
  wasteLiters: number;
  confirmed: boolean;
};

export function validateBatchClose(
  input: BatchCloseValidationInput,
): { ok: true } | { ok: false; error: string } {
  if (isBatchClosed(input.batch)) {
    return { ok: false, error: "This batch is already closed." };
  }

  if (normalizeQcOutcome(input.batch.qcOutcome) !== "approved") {
    return {
      ok: false,
      error: "Only successful (approved) batches can be closed. Use discard for unsuccessful batches.",
    };
  }

  if (!input.confirmed) {
    return { ok: false, error: "Confirm you have checked this batch." };
  }

  if (!Number.isFinite(input.wasteLiters) || input.wasteLiters < 0) {
    return { ok: false, error: "Enter a valid waste amount (liters)." };
  }

  const waste = roundLiters(input.wasteLiters);
  const remaining = roundLiters(input.remainingLiters);
  if (waste > remaining + WASTE_EPSILON) {
    return {
      ok: false,
      error: `Waste cannot exceed remaining pool (${remaining} L).`,
    };
  }

  return { ok: true };
}
