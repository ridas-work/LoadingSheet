import { buildSheetLines, type OrderItemInput, type SheetLine } from "@/lib/buildSheetLines";
import { buildMixedSampleSheetLines, type MixedSampleContent } from "@/lib/mixedSampleBox";

/** One physical carton type containing multiple SKU lines (same shape as mixed sample). */
export type CustomCartonDef = {
  boxCount: number;
  contents: MixedSampleContent[];
  /** Optional override for the printed row title; default = auto label from contents. */
  label?: string;
};

/**
 * Append standard carton rows, then custom multi-product carton rows, with global `boxNo` 1…N.
 */
export function mergeStandardAndCustomSheetLines(
  standardItems: OrderItemInput[],
  customCartons: CustomCartonDef[],
): SheetLine[] {
  const merged: SheetLine[] = [];
  for (const item of standardItems) {
    merged.push(...buildSheetLines([item]));
  }
  for (const carton of customCartons) {
    const lines = buildMixedSampleSheetLines({
      boxCount: carton.boxCount,
      contents: carton.contents,
    });
    const label = carton.label?.trim();
    for (const line of lines) {
      merged.push({
        ...line,
        productName: label || line.productName,
      });
    }
  }
  return merged.map((line, i) => ({ ...line, boxNo: i + 1 }));
}
