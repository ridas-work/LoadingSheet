import type { SheetLineLike } from "@/lib/bundleCatalog";
import { lineBatchComplete } from "@/lib/bundleCatalog";
import type { PackingCatalogRow } from "@/lib/bundleCatalog";
import {
  allocateReadyStockToLines,
  lineBatchCompleteWithReady,
  type LineReadySplit,
  type ReadyBatchLotInput,
} from "@/lib/readyStockAllocation";
import type { DeductionPacking, DeductionSheetLine } from "@/lib/packagingDeduction";

export function batchProgress(
  sheetLines: SheetLineLike[] | undefined | null,
  catalog?: PackingCatalogRow[],
  readyByBox?: Map<number, LineReadySplit>,
) {
  const lines = sheetLines ?? [];
  const total = lines.length;
  const filled = catalog
    ? lines.filter((l) =>
        readyByBox
          ? lineBatchCompleteWithReady(l, catalog, readyByBox)
          : lineBatchComplete(l, catalog),
      ).length
    : lines.filter((l) => {
        if (l.lineKind === "mixed_sample") {
          const components = l.componentBatches ?? [];
          const expected = l.mixedContents?.length ?? 0;
          return (
            expected > 0 &&
            components.length >= expected &&
            components.slice(0, expected).every((c) => c.batchNo?.trim())
          );
        }
        return typeof l.batchNo === "string" && l.batchNo.trim().length > 0;
      }).length;
  return { filled, total, complete: total > 0 && filled === total };
}

export function isBatchAssignmentLocked(
  sheetLines: SheetLineLike[] | undefined | null,
  catalog?: PackingCatalogRow[],
  readyByBox?: Map<number, LineReadySplit>,
): boolean {
  return batchProgress(sheetLines, catalog, readyByBox).complete;
}

export function readyAllocationForOrder(
  sheetLines: SheetLineLike[] | undefined | null,
  catalog: DeductionPacking[],
  onHandByProductCode: Map<string, number> | Record<string, number>,
  batchLots?: ReadyBatchLotInput[],
): Map<number, LineReadySplit> {
  const deductionLines: DeductionSheetLine[] = (sheetLines ?? []).map((l) => ({
    boxNo: l.boxNo,
    productName: l.productName,
    bottlesPerBox: l.bottlesPerBox,
    lineKind: l.lineKind,
    mixedContents: l.mixedContents,
  }));
  return allocateReadyStockToLines(deductionLines, catalog, onHandByProductCode, batchLots).byBoxNo;
}
