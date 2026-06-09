import type { SheetLine } from "@/lib/buildSheetLines";

type LineWithBatches = SheetLine & {
  batchNo?: string;
  componentBatches?: Array<{ productName: string; batchNo: string }>;
};

function lineKey(line: LineWithBatches): string {
  if (line.lineKind === "mixed_sample") {
    const mc = (line.mixedContents ?? [])
      .map((c) => `${c.productName.trim().toLowerCase()}:${c.bottles}`)
      .sort()
      .join("|");
    return `mixed:${line.boxNo}:${mc}`;
  }
  return `std:${line.boxNo}:${line.productName.trim().toLowerCase()}:${line.bottlesPerBox}`;
}

/** Copy batchNo, componentBatches, weight, and cartonWeightKg from old lines when row identity matches. */
export function preserveSheetBatches(
  oldLines: LineWithBatches[],
  newLines: SheetLine[],
): SheetLine[] {
  const byKey = new Map<string, LineWithBatches>();
  for (const line of oldLines) {
    byKey.set(lineKey(line), line);
  }

  return newLines.map((line) => {
    const prev = byKey.get(lineKey(line));
    if (!prev) return line;
    return {
      ...line,
      batchNo: prev.batchNo?.trim() ? prev.batchNo : line.batchNo,
      componentBatches:
        prev.componentBatches && prev.componentBatches.length > 0
          ? prev.componentBatches
          : line.componentBatches,
      weight: prev.weight ?? line.weight,
      cartonWeightKg: prev.cartonWeightKg ?? line.cartonWeightKg,
    };
  });
}
