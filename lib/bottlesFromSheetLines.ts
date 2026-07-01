import {
  summarizePackagingConsumption,
  type DeductionPacking,
  type DeductionSheetLine,
} from "@/lib/packagingDeduction";
import { familyFromStockCode, isFamilyStockCode } from "@/lib/productPackingMatch";

export type ProductBottleNeed = {
  productCode: string;
  productName: string;
  bottles: number;
};

function displayNameForNeed(productCode: string, catalog: DeductionPacking[]): string {
  if (isFamilyStockCode(productCode)) {
    const family = familyFromStockCode(productCode);
    const label = family.charAt(0).toUpperCase() + family.slice(1);
    return `${label} (mixed sizes)`;
  }
  const packing = catalog.find((p) => p.code.trim().toLowerCase() === productCode);
  return packing?.name ?? productCode;
}

/** Aggregate filled-bottle demand per catalog product from loading-sheet rows. */
export function bottlesPerProductFromSheetLines(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
): { needs: ProductBottleNeed[]; missingProducts: string[] } {
  const { consumption, missingProducts } = summarizePackagingConsumption(sheetLines, catalog);
  const needs: ProductBottleNeed[] = [];

  for (const [productCode, bottles] of consumption.productBottles) {
    if (bottles <= 0) continue;
    needs.push({
      productCode,
      productName: displayNameForNeed(productCode, catalog),
      bottles,
    });
  }

  needs.sort((a, b) => a.productName.localeCompare(b.productName));
  return { needs, missingProducts };
}
