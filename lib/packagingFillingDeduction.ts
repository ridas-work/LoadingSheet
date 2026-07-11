import { isFillingContainerSizeCode, packingCatalogFromDocs } from "@/lib/catalogFromDb";
import {
  type DeductionPackagingItem,
  type DeductionPacking,
} from "@/lib/packagingDeduction";

export type FillingPackingLineInput = {
  productCode: string;
  filledBottlesToday: number;
};

export type PackagingUipAppliedLine = {
  productCode: string;
  filledBottlesApplied: number;
};

export type FillingUipIncrement = {
  itemCode: string;
  itemName: string;
  quantity: number;
  detail: string;
};

/**
 * Filling no longer deducts packaging inventory directly.
 * Delivery closes one sheet box with the **full BOM recipe** so stock stays accurate
 * without double-counting bottles/caps at fill time.
 */
export function computeFillingUipIncrements(_args: {
  previousLines: FillingPackingLineInput[];
  newLines: FillingPackingLineInput[];
  catalog: DeductionPacking[];
  packagingItems: DeductionPackagingItem[];
}): {
  increments: FillingUipIncrement[];
  missingMappings: string[];
  insufficientStock: string[];
} {
  void isFillingContainerSizeCode;
  return { increments: [], missingMappings: [], insufficientStock: [] };
}

export { packingCatalogFromDocs };
