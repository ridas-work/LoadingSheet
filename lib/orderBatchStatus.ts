import type { SheetLineLike } from "@/lib/bundleCatalog";
import { lineBatchComplete } from "@/lib/bundleCatalog";
import type { PackingCatalogRow } from "@/lib/bundleCatalog";

export function batchProgress(
  sheetLines: SheetLineLike[] | undefined | null,
  catalog?: PackingCatalogRow[],
) {
  const lines = sheetLines ?? [];
  const total = lines.length;
  const filled = catalog
    ? lines.filter((l) => lineBatchComplete(l, catalog)).length
    : lines.filter((l) => typeof l.batchNo === "string" && l.batchNo.trim().length > 0).length;
  return { filled, total, complete: total > 0 && filled === total };
}

export function isBatchAssignmentLocked(
  sheetLines: SheetLineLike[] | undefined | null,
  catalog?: PackingCatalogRow[],
): boolean {
  return batchProgress(sheetLines, catalog).complete;
}
