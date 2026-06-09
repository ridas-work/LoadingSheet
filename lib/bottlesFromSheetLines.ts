import {
  summarizePackagingConsumption,
  type DeductionPacking,
  type DeductionSheetLine,
} from "@/lib/packagingDeduction";

export type ProductBottleNeed = {
  productCode: string;
  productName: string;
  bottles: number;
};

/** Aggregate filled-bottle demand per catalog product from loading-sheet rows. */
export function bottlesPerProductFromSheetLines(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
): { needs: ProductBottleNeed[]; missingProducts: string[] } {
  const { consumption, missingProducts } = summarizePackagingConsumption(sheetLines, catalog);
  const needs: ProductBottleNeed[] = [];

  for (const [productCode, bottles] of consumption.productBottles) {
    if (bottles <= 0) continue;
    const packing = catalog.find((p) => p.code.trim().toLowerCase() === productCode);
    needs.push({
      productCode,
      productName: packing?.name ?? productCode,
      bottles,
    });
  }

  needs.sort((a, b) => a.productName.localeCompare(b.productName));
  return { needs, missingProducts };
}
