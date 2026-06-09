/** Rule B: one printed row per carton/box; bottles column = bottles per carton. */

export type OrderItemInput = {
  productName: string;
  boxes: number;
  bottlesPerBox: number;
};

export type SheetLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  batchNo: string;
  weight: number | null;
  cartonWeightKg?: number | null;
  lineKind?: "standard" | "mixed_sample";
  mixedContents?: Array<{ productName: string; bottles: number }>;
  componentBatches?: Array<{ productName: string; batchNo: string }>;
  customBoxCode?: string;
};

export function buildSheetLines(items: OrderItemInput[]): SheetLine[] {
  const lines: SheetLine[] = [];
  let boxNo = 1;
  for (const it of items) {
    for (let i = 0; i < it.boxes; i++) {
      lines.push({
        boxNo: boxNo++,
        productName: it.productName,
        bottlesPerBox: it.bottlesPerBox,
        batchNo: "",
        weight: null,
        lineKind: "standard",
        mixedContents: [],
        componentBatches: [],
      });
    }
  }
  return lines;
}
