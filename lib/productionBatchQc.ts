export type ProductionBatchQcOutcome = "approved" | "rejected" | "discarded";
export type QcOutcomeInput = "approved" | "rejected";

export function parseQcOutcomeBody(
  body: Record<string, unknown>,
):
  | { ok: true; outcome: QcOutcomeInput; comment: string }
  | { ok: false; error: string } {
  const raw = body.qcOutcome;
  if (raw !== "approved" && raw !== "rejected") {
    return { ok: false, error: "Select Successful or Unsuccessful for this batch." };
  }
  const comment = typeof body.qcComment === "string" ? body.qcComment.trim() : "";
  if (raw === "rejected" && !comment) {
    return { ok: false, error: "Comment is required when marking a batch unsuccessful." };
  }
  return { ok: true, outcome: raw, comment };
}

export function normalizeQcOutcome(value: unknown): ProductionBatchQcOutcome {
  if (value === "rejected" || value === "discarded") return value;
  return "approved";
}

export function isBatchDispatchable(batch: { qcOutcome?: unknown }): boolean {
  return normalizeQcOutcome(batch.qcOutcome) === "approved";
}

/** Mongo filter — batches Rashid can assign on loading sheets. */
export const dispatchableBatchFilter = {
  $or: [{ qcOutcome: "approved" }, { qcOutcome: { $exists: false } }, { qcOutcome: null }],
};

export function qcOutcomeLabel(outcome: ProductionBatchQcOutcome): string {
  switch (outcome) {
    case "rejected":
      return "Unsuccessful";
    case "discarded":
      return "Discarded";
    default:
      return "Approved";
  }
}

export function qcOutcomeBadgeClass(outcome: ProductionBatchQcOutcome): string {
  switch (outcome) {
    case "rejected":
      return "bg-red-50 text-red-900 ring-red-200";
    case "discarded":
      return "bg-zinc-200 text-zinc-800 ring-zinc-300";
    default:
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
  }
}
