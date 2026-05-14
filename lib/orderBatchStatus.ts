type SheetLineLike = { batchNo?: string | null };

export function batchProgress(sheetLines: SheetLineLike[] | undefined | null) {
  const lines = sheetLines ?? [];
  const total = lines.length;
  const filled = lines.filter((l) => typeof l.batchNo === "string" && l.batchNo.trim().length > 0).length;
  return { filled, total, complete: total > 0 && filled === total };
}

export function isBatchAssignmentLocked(sheetLines: SheetLineLike[] | undefined | null): boolean {
  return batchProgress(sheetLines).complete;
}
