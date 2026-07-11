import { isMixedSampleLine } from "@/lib/mixedSampleBox";
import {
  isDrumContainerProduct,
  isJarOnlyDeductionBottleSize,
  isNoPackagingDeductionBottleSize,
  jarPackagingDeductionForLine,
  normalizeBottleSizeCode,
} from "@/lib/customBottleSizes";
import {
  familyKeyForLineName,
  familyStockKey,
  findPackingForLineName,
} from "@/lib/productPackingMatch";
import { expandBomRequirements, findBomEntry } from "@/lib/packagingBom";
import type { LineReadySplit } from "@/lib/readyStockAllocation";
import { packagingBalance, type PackagingQtyFields } from "@/lib/packagingInventory";

type BundleComponentRef = { code: string; bottlesPerUnit: number };

export type DeductionPacking = {
  code: string;
  name: string;
  bottlesPerCarton: number;
  aliases?: string[];
  batchFamily?: string | null;
  bundleComponents?: BundleComponentRef[];
};

export type DeductionPackagingItem = PackagingQtyFields & {
  code: string;
  name: string;
  category: string;
  linkedProductCode?: string | null;
  linkedBatchFamily?: string | null;
  deductAs?: string | null;
  active?: boolean | null;
};

export type DeductionSheetLine = {
  boxNo?: number;
  productName: string;
  bottlesPerBox: number;
  lineKind?: string | null;
  mixedContents?: Array<{ productName: string; bottles: number; bottleSizeCode?: string }> | null;
  customBoxCode?: string | null;
};

export type PackagingDeductionLine = {
  itemCode: string;
  itemName: string;
  category: string;
  quantity: number;
  quantityAfter: number;
  reasonDetail: string;
};

export type PackagingDeductionPreview = {
  lines: PackagingDeductionLine[];
  missingMappings: string[];
  insufficientStock: string[];
};

type Consumption = {
  productBottles: Map<string, number>;
  productCartons: Map<string, number>;
  mixedBoxFamilies: Map<string, number>;
  customCartonBoxes: Map<string, number>;
};

function key(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function add(map: Map<string, number>, code: string, qty: number) {
  const c = key(code);
  if (!c || qty <= 0) return;
  map.set(c, (map.get(c) ?? 0) + qty);
}

function mixedPartSkipsDeduction(part: {
  productName: string;
  bottleSizeCode?: string;
}): boolean {
  return (
    isNoPackagingDeductionBottleSize(part.bottleSizeCode) ||
    isDrumContainerProduct(part.productName, part.bottleSizeCode)
  );
}

function mixedPartUsesCatalogBom(part: { bottleSizeCode?: string }): boolean {
  const code = normalizeBottleSizeCode(part.bottleSizeCode);
  if (!code || code === "catalog") return true;
  if (isJarOnlyDeductionBottleSize(code)) return false;
  if (isNoPackagingDeductionBottleSize(code)) return false;
  return true;
}

function mergeQty(target: Map<string, number>, source: Map<string, number>) {
  for (const [code, qty] of source) add(target, code, qty);
}

function findPackingByName(
  name: string,
  catalog: DeductionPacking[],
  context?: { parentLineName?: string },
): DeductionPacking | null {
  return findPackingForLineName(name, catalog, context) as DeductionPacking | null;
}

function findCustomCartonBoxItem(
  items: DeductionPackagingItem[],
  boxCode: string,
): DeductionPackagingItem | null {
  const code = key(boxCode);
  return (
    items.find(
      (item) =>
        item.active !== false &&
        key(item.code) === code &&
        key(item.deductAs || item.category) === "box",
    ) ?? null
  );
}

function itemByCode(
  items: DeductionPackagingItem[],
  code: string,
): DeductionPackagingItem | null {
  const c = key(code);
  return items.find((item) => item.active !== false && key(item.code) === c) ?? null;
}

function packingFamily(packing: DeductionPacking): string {
  return packing.batchFamily?.trim() || packing.name;
}

function emptyConsumption(): Consumption {
  return {
    productBottles: new Map(),
    productCartons: new Map(),
    mixedBoxFamilies: new Map(),
    customCartonBoxes: new Map(),
  };
}

function consumePacking(
  consumption: Consumption,
  packing: DeductionPacking,
  bottles: number,
  cartons: number,
) {
  if (bottles <= 0 && cartons <= 0) return;
  if (packing.bundleComponents?.length) {
    for (const ref of packing.bundleComponents) {
      add(consumption.productBottles, key(ref.code), bottles * ref.bottlesPerUnit);
    }
    add(consumption.productCartons, key(packing.code), cartons);
    return;
  }
  add(consumption.productBottles, key(packing.code), bottles);
  add(consumption.productCartons, key(packing.code), cartons);
}

/** Expand one product packing into packaging SKU quantities from the BOM. */
function bomQtyForPacking(
  packing: DeductionPacking,
  bottles: number,
  cartons: number,
): Map<string, number> {
  if (findBomEntry(packing.code)) {
    return expandBomRequirements(packing.code, bottles, cartons);
  }

  const out = new Map<string, number>();
  if (packing.bundleComponents?.length) {
    for (const ref of packing.bundleComponents) {
      mergeQty(out, expandBomRequirements(ref.code, bottles * ref.bottlesPerUnit, 0));
    }
  }
  return out;
}

/**
 * One sheet box → full BOM packaging recipe on packaging inventory.
 * qtyPerBottle × bottles in that row + qtyPerCarton × 1 carton.
 */
export function summarizeBomPackagingRequirements(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
): {
  requirements: Map<string, number>;
  missingProducts: string[];
  missingBom: string[];
  customBoxCodes: Map<string, number>;
} {
  const requirements = new Map<string, number>();
  const missingProducts = new Set<string>();
  const missingBom = new Set<string>();
  const customBoxCodes = new Map<string, number>();

  for (const line of sheetLines) {
    if (!isMixedSampleLine(line) && isDrumContainerProduct(line.productName)) {
      continue;
    }

    if (isMixedSampleLine(line) && line.mixedContents?.length) {
      const parts = line.mixedContents.filter((part) => !mixedPartSkipsDeduction(part));
      if (parts.length === 0) continue;

      for (const part of parts) {
        const jarDeduction = jarPackagingDeductionForLine({
          productName: part.productName,
          bottleSizeCode: part.bottleSizeCode,
          bottleCount: part.bottles,
        });
        if (jarDeduction) {
          add(customBoxCodes, jarDeduction.jarCode, jarDeduction.quantity);
          continue;
        }

        const packing = findPackingByName(part.productName, catalog, {
          parentLineName: line.productName,
        });
        if (!packing) {
          missingProducts.add(part.productName);
          continue;
        }
        if (!findBomEntry(packing.code) && !packing.bundleComponents?.length) {
          missingBom.add(packing.name);
          continue;
        }
        mergeQty(requirements, bomQtyForPacking(packing, part.bottles, 0));
      }

      const needsOuterBox = line.mixedContents.some((part) => mixedPartUsesCatalogBom(part));
      if (needsOuterBox && line.customBoxCode?.trim()) {
        add(customBoxCodes, line.customBoxCode, 1);
      }
      continue;
    }

    const jarDeduction = jarPackagingDeductionForLine({
      productName: line.productName,
      bottleCount: Math.max(0, Math.floor(line.bottlesPerBox) || 1),
    });
    if (jarDeduction) {
      add(customBoxCodes, jarDeduction.jarCode, jarDeduction.quantity);
      continue;
    }

    const packing = findPackingByName(line.productName, catalog);
    if (!packing) {
      missingProducts.add(line.productName);
      continue;
    }
    if (!findBomEntry(packing.code) && !packing.bundleComponents?.length) {
      missingBom.add(packing.name);
      continue;
    }

    const bottles = Math.max(0, Math.floor(line.bottlesPerBox) || packing.bottlesPerCarton);
    mergeQty(requirements, bomQtyForPacking(packing, bottles, 1));
  }

  return {
    requirements,
    missingProducts: [...missingProducts],
    missingBom: [...missingBom],
    customBoxCodes,
  };
}

/** Bottle/carton totals for ready stock + reports (not packaging UIP). */
export function summarizePackagingConsumption(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
): { consumption: Consumption; missingProducts: string[] } {
  const consumption = emptyConsumption();
  const missingProducts = new Set<string>();

  for (const line of sheetLines) {
    if (!isMixedSampleLine(line) && isDrumContainerProduct(line.productName)) {
      continue;
    }

    if (isMixedSampleLine(line) && line.mixedContents?.length) {
      const parts = line.mixedContents.filter((part) => !mixedPartSkipsDeduction(part));
      if (parts.length === 0) continue;

      const families = new Set<string>();
      for (const part of parts) {
        const jarDeduction = jarPackagingDeductionForLine({
          productName: part.productName,
          bottleSizeCode: part.bottleSizeCode,
          bottleCount: part.bottles,
        });
        if (jarDeduction) {
          add(consumption.customCartonBoxes, jarDeduction.jarCode, jarDeduction.quantity);
          continue;
        }

        const packing = findPackingByName(part.productName, catalog, {
          parentLineName: line.productName,
        });
        if (packing) {
          consumePacking(consumption, packing, part.bottles, 0);
          families.add(packingFamily(packing));
          continue;
        }
        const family = familyKeyForLineName(part.productName, catalog);
        if (family) {
          add(consumption.productBottles, familyStockKey(family), part.bottles);
          families.add(family);
          continue;
        }
        missingProducts.add(part.productName);
      }
      const needsOuterBox = line.mixedContents.some((part) => mixedPartUsesCatalogBom(part));
      if (needsOuterBox) {
        if (line.customBoxCode?.trim()) {
          add(consumption.customCartonBoxes, line.customBoxCode, 1);
        } else {
          const family = [...families][0];
          if (family) add(consumption.mixedBoxFamilies, key(family), 1);
        }
      }
      continue;
    }

    const jarDeduction = jarPackagingDeductionForLine({
      productName: line.productName,
      bottleCount: Math.max(0, Math.floor(line.bottlesPerBox) || 1),
    });
    if (jarDeduction) {
      add(consumption.customCartonBoxes, jarDeduction.jarCode, jarDeduction.quantity);
      continue;
    }

    const packing = findPackingByName(line.productName, catalog);
    if (!packing) {
      const family = familyKeyForLineName(line.productName, catalog);
      if (family) {
        add(consumption.productBottles, familyStockKey(family), line.bottlesPerBox);
        continue;
      }
      missingProducts.add(line.productName);
      continue;
    }
    consumePacking(consumption, packing, line.bottlesPerBox, 1);
  }

  return { consumption, missingProducts: [...missingProducts] };
}

/** Delivery always uses the full BOM; ready-stock no longer skips packaging. */
export function summarizePackagingConsumptionExcludingReady(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
  _readyByBox: Map<number, LineReadySplit>,
) {
  return summarizePackagingConsumption(sheetLines, catalog);
}

export function buildPackagingDeductionPreview(args: {
  sheetLines: DeductionSheetLine[];
  catalog: DeductionPacking[];
  packagingItems: DeductionPackagingItem[];
  /** Ignored — one sheet box always deducts the full BOM recipe. */
  readyByBox?: Map<number, LineReadySplit>;
}): PackagingDeductionPreview {
  const { requirements, missingProducts, missingBom, customBoxCodes } =
    summarizeBomPackagingRequirements(args.sheetLines, args.catalog);

  const quantities = new Map<string, PackagingDeductionLine>();
  const missingMappings = new Set<string>([
    ...missingProducts.map((name) => `No product packing found for "${name}"`),
    ...missingBom.map((name) => `No packaging BOM recipe for "${name}"`),
  ]);

  function push(item: DeductionPackagingItem, quantity: number, detail: string) {
    if (quantity <= 0) return;
    const existing = quantities.get(item.code);
    const nextQty = (existing?.quantity ?? 0) + quantity;
    quantities.set(item.code, {
      itemCode: item.code,
      itemName: item.name,
      category: item.category,
      quantity: nextQty,
      quantityAfter: packagingBalance(item) - nextQty,
      reasonDetail: existing ? `${existing.reasonDetail}; ${detail}` : detail,
    });
  }

  for (const [itemCode, quantity] of requirements) {
    const item = itemByCode(args.packagingItems, itemCode);
    if (!item) {
      missingMappings.add(`Packaging item "${itemCode}" missing from packaging inventory catalog`);
      continue;
    }
    push(item, quantity, `${quantity} × ${item.name} (BOM)`);
  }

  for (const [boxCode, boxes] of customBoxCodes) {
    const item = findCustomCartonBoxItem(args.packagingItems, boxCode);
    const isJarSku = boxCode.startsWith("custom-box-");
    if (item) {
      push(
        item,
        boxes,
        isJarSku && boxes !== 1
          ? `${boxes} jar/container (${boxCode})`
          : isJarSku
            ? `1 jar/container (${boxCode})`
            : `${boxes} custom outer box (${boxCode})`,
      );
    } else missingMappings.add(`No custom carton box item for code "${boxCode}"`);
  }

  const lines = [...quantities.values()].sort((a, b) => a.itemName.localeCompare(b.itemName));
  const insufficientStock = lines
    .filter((line) => line.quantityAfter < 0)
    .map((line) => {
      const balance = line.quantity + line.quantityAfter;
      return `Insufficient ${line.itemName}: need ${line.quantity}, balance ${balance} (Purchased − Rejected − UIP)`;
    });

  return {
    lines,
    missingMappings: [...missingMappings],
    insufficientStock,
  };
}

export function assertPackagingDeductionPreview(preview: PackagingDeductionPreview): string | null {
  if (preview.missingMappings.length > 0) {
    return `Packaging mapping missing: ${preview.missingMappings.join("; ")}`;
  }
  if (preview.insufficientStock.length > 0) return preview.insufficientStock.join("; ");
  return null;
}
