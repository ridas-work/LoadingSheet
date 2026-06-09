import { isMixedSampleLine } from "@/lib/mixedSampleBox";
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
  mixedContents?: Array<{ productName: string; bottles: number }> | null;
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

function emptyConsumption(): Consumption {
  return {
    productBottles: new Map(),
    productCartons: new Map(),
    mixedBoxFamilies: new Map(),
    customCartonBoxes: new Map(),
  };
}

function addCustomCartonBox(consumption: Consumption, customBoxCode: string | null | undefined) {
  const code = key(customBoxCode);
  if (!code) return;
  add(consumption.customCartonBoxes, code, 1);
}

function key(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function add(map: Map<string, number>, code: string, qty: number) {
  if (!code || qty <= 0) return;
  map.set(code, (map.get(code) ?? 0) + qty);
}

function findPackingByName(name: string, catalog: DeductionPacking[]): DeductionPacking | null {
  const k = key(name);
  if (!k) return null;
  return (
    catalog.find((p) => key(p.name) === k) ??
    catalog.find((p) => (p.aliases ?? []).some((alias) => key(alias) === k)) ??
    null
  );
}

function matchesFamily(itemFamily: string | null | undefined, packingFamily: string): boolean {
  const item = key(itemFamily);
  const packing = key(packingFamily);
  return Boolean(item && packing && (packing === item || packing.startsWith(item) || item.startsWith(packing)));
}

function packingFamily(packing: DeductionPacking): string {
  return packing.batchFamily?.trim() || packing.name;
}

function containerKind(packing: DeductionPacking): "pouch" | "bottle" {
  return /pouch/i.test(packing.name) ? "pouch" : "bottle";
}

function consumePacking(consumption: Consumption, packing: DeductionPacking, bottles: number, cartons: number) {
  if (bottles <= 0) return;
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

export function summarizePackagingConsumption(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
): { consumption: Consumption; missingProducts: string[] } {
  const consumption = emptyConsumption();
  const missingProducts = new Set<string>();

  for (const line of sheetLines) {
    if (isMixedSampleLine(line) && line.mixedContents?.length) {
      const families = new Set<string>();
      for (const part of line.mixedContents) {
        const packing = findPackingByName(part.productName, catalog);
        if (!packing) {
          missingProducts.add(part.productName);
          continue;
        }
        consumePacking(consumption, packing, part.bottles, 0);
        families.add(packingFamily(packing));
      }
      if (line.customBoxCode?.trim()) {
        addCustomCartonBox(consumption, line.customBoxCode);
      } else {
        const family = [...families][0];
        if (family) add(consumption.mixedBoxFamilies, key(family), 1);
      }
      continue;
    }

    const packing = findPackingByName(line.productName, catalog);
    if (!packing) {
      missingProducts.add(line.productName);
      continue;
    }
    consumePacking(consumption, packing, line.bottlesPerBox, 1);
  }

  return { consumption, missingProducts: [...missingProducts] };
}

/**
 * Packaging consumption for gate delivery: only bottles/cartons that still need
 * Nimra fill. Ready-shelf bottles are already labelled, capped, and boxed.
 */
export function summarizePackagingConsumptionExcludingReady(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
  readyByBox: Map<number, LineReadySplit>,
): { consumption: Consumption; missingProducts: string[] } {
  const consumption = emptyConsumption();
  const missingProducts = new Set<string>();

  for (const line of sheetLines) {
    const boxNo = line.boxNo ?? 0;
    const split = readyByBox.get(boxNo);
    if (!split || split.bottlesNeedingBatch <= 0) continue;

    const deductCarton = split.bottlesFromReady <= 0;

    if (isMixedSampleLine(line) && line.mixedContents?.length) {
      const families = new Set<string>();
      for (const part of line.mixedContents) {
        const packing = findPackingByName(part.productName, catalog);
        if (!packing) {
          missingProducts.add(part.productName);
          continue;
        }
        const comp = split.components?.find(
          (c) => key(c.productName) === key(packing.name) || key(c.productCode) === key(packing.code),
        );
        const needing = comp?.bottlesNeedingBatch ?? part.bottles;
        if (needing > 0) {
          add(consumption.productBottles, key(packing.code), needing);
        }
        families.add(packingFamily(packing));
      }
      if (deductCarton) {
        if (line.customBoxCode?.trim()) {
          addCustomCartonBox(consumption, line.customBoxCode);
        } else {
          const family = [...families][0];
          if (family) add(consumption.mixedBoxFamilies, key(family), 1);
        }
      }
      continue;
    }

    const packing = findPackingByName(line.productName, catalog);
    if (!packing) {
      missingProducts.add(line.productName);
      continue;
    }

    if (packing.bundleComponents?.length) {
      for (const ref of packing.bundleComponents) {
        const partPacking = catalog.find((p) => key(p.code) === key(ref.code));
        if (!partPacking) continue;
        const comp = split.components?.find((c) => key(c.productCode) === key(ref.code));
        const needing = comp?.bottlesNeedingBatch ?? line.bottlesPerBox * ref.bottlesPerUnit;
        if (needing > 0) {
          add(consumption.productBottles, key(partPacking.code), needing);
        }
      }
      if (deductCarton) {
        add(consumption.productCartons, key(packing.code), 1);
      }
      continue;
    }

    add(consumption.productBottles, key(packing.code), split.bottlesNeedingBatch);
    if (deductCarton) {
      add(consumption.productCartons, key(packing.code), 1);
    }
  }

  return { consumption, missingProducts: [...missingProducts] };
}

function productItemMatches(item: DeductionPackagingItem, packing: DeductionPacking, deductAs: string): boolean {
  if (key(item.deductAs || item.category) !== deductAs) return false;
  if (key(item.linkedProductCode) === key(packing.code)) return true;
  return matchesFamily(item.linkedBatchFamily, packingFamily(packing));
}

function findProductItem(
  items: DeductionPackagingItem[],
  packing: DeductionPacking,
  deductAs: string,
): DeductionPackagingItem | null {
  return items.find((item) => item.active !== false && productItemMatches(item, packing, deductAs)) ?? null;
}

function findFamilyBoxItem(
  items: DeductionPackagingItem[],
  family: string,
): DeductionPackagingItem | null {
  return (
    items.find(
      (item) =>
        item.active !== false &&
        key(item.deductAs || item.category) === "box" &&
        matchesFamily(item.linkedBatchFamily, family),
    ) ?? null
  );
}

function findCustomCartonBoxItem(
  items: DeductionPackagingItem[],
  boxCode: string,
): DeductionPackagingItem | null {
  const code = key(boxCode);
  return (
    items.find(
      (item) => item.active !== false && key(item.code) === code && key(item.deductAs || item.category) === "box",
    ) ?? null
  );
}

export function buildPackagingDeductionPreview(args: {
  sheetLines: DeductionSheetLine[];
  catalog: DeductionPacking[];
  packagingItems: DeductionPackagingItem[];
  /** When set, skip packaging for ready-shelf bottles (already assembled). */
  readyByBox?: Map<number, LineReadySplit>;
}): PackagingDeductionPreview {
  const { consumption, missingProducts } = args.readyByBox
    ? summarizePackagingConsumptionExcludingReady(args.sheetLines, args.catalog, args.readyByBox)
    : summarizePackagingConsumption(args.sheetLines, args.catalog);
  const quantities = new Map<string, PackagingDeductionLine>();
  const missingMappings = new Set<string>(missingProducts.map((name) => `No product packing found for "${name}"`));

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

  for (const [productCode, bottles] of consumption.productBottles) {
    if (bottles <= 0) continue;
    const packing = args.catalog.find((p) => key(p.code) === productCode);
    if (!packing) continue;
    const primaryKind = containerKind(packing);
    const primary = findProductItem(args.packagingItems, packing, primaryKind);
    if (primary) push(primary, bottles, `${bottles} ${packing.name} ${primaryKind}s`);
    else missingMappings.add(`No ${primaryKind} packaging item mapped for ${packing.name}`);

    for (const kind of ["cap", "sticker", "label"] as const) {
      const item = findProductItem(args.packagingItems, packing, kind);
      if (item) push(item, bottles, `${bottles} ${packing.name} ${kind}s`);
    }
  }

  for (const [productCode, cartons] of consumption.productCartons) {
    if (cartons <= 0) continue;
    const packing = args.catalog.find((p) => key(p.code) === productCode);
    if (!packing) continue;
    const item = findProductItem(args.packagingItems, packing, "box");
    if (item) push(item, cartons, `${cartons} ${packing.name} carton(s), ${packing.bottlesPerCarton} bottles/carton`);
    else missingMappings.add(`No carton/box packaging item mapped for ${packing.name}`);
  }

  for (const [family, boxes] of consumption.mixedBoxFamilies) {
    if (boxes <= 0) continue;
    const item = findFamilyBoxItem(args.packagingItems, family);
    if (item) push(item, boxes, `${boxes} mixed/custom carton(s) for ${family}`);
    else missingMappings.add(`No carton/box packaging item mapped for mixed/custom carton family "${family}"`);
  }

  for (const [boxCode, boxes] of consumption.customCartonBoxes) {
    if (boxes <= 0) continue;
    const item = findCustomCartonBoxItem(args.packagingItems, boxCode);
    if (item) push(item, boxes, `${boxes} custom outer box (${boxCode})`);
    else missingMappings.add(`No custom carton box item for code "${boxCode}"`);
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
  if (preview.missingMappings.length > 0) return `Packaging mapping missing: ${preview.missingMappings.join("; ")}`;
  if (preview.insufficientStock.length > 0) return preview.insufficientStock.join("; ");
  return null;
}
