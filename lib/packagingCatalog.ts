/**
 * Future Phase 17: map filled product units → packaging components to deduct from inventory.
 * v1 returns empty — no auto-deduct yet.
 */

export type PackagingNeed = {
  itemCode: string;
  quantity: number;
};

export type SheetLineForPackaging = {
  productName: string;
  bottlesPerBox: number;
  lineKind?: string | null;
  mixedContents?: Array<{ productName: string; bottles: number }> | null;
};

/** Stub: will resolve BOM per product packing and return bottle/cap/sticker needs. */
export function packagingNeedsForSheetLine(_line: SheetLineForPackaging): PackagingNeed[] {
  return [];
}

/** Stub: aggregate needs for an entire order sheet. */
export function packagingNeedsForSheetLines(lines: SheetLineForPackaging[]): PackagingNeed[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    for (const need of packagingNeedsForSheetLine(line)) {
      totals.set(need.itemCode, (totals.get(need.itemCode) ?? 0) + need.quantity);
    }
  }
  return [...totals.entries()].map(([itemCode, quantity]) => ({ itemCode, quantity }));
}
