import { isMixedSampleLine } from "@/lib/mixedSampleBox";

export type CartonLabel = {
  boxNo: number;
  title: string;
  contents: Array<{ productName: string; bottles: number }>;
};

type SheetLineLike = {
  boxNo: number;
  productName: string;
  lineKind?: string | null;
  mixedContents?: Array<{ productName: string; bottles: number }> | null;
};

/** Custom / mixed carton rows from a loading sheet — one printable label per physical box. */
export function cartonLabelsFromSheetLines(lines: SheetLineLike[]): CartonLabel[] {
  return lines
    .filter(isMixedSampleLine)
    .map((row) => ({
      boxNo: row.boxNo,
      title: row.productName.trim() || "Custom carton",
      contents: (row.mixedContents ?? []).map((c) => ({
        productName: c.productName.trim(),
        bottles: c.bottles,
      })),
    }));
}
