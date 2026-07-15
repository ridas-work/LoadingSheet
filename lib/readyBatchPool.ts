import {
  batchUsageKey,
  formatLiters,
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  productsMatch,
  roundLiters,
  type ProductionBatchPoolItem,
} from "@/lib/batchVolume";
import { findPackingByName, type PackingCatalogRow } from "@/lib/bundleCatalog";

export type ReadyLotLike = {
  batchNo: string;
  productCode: string;
  productName: string;
  bottles: number;
  batchProductName?: string;
};

export function batchFamilyForLineName(name: string, catalog: PackingCatalogRow[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const packing = findPackingByName(trimmed, catalog);
  if (packing?.batchFamily?.trim()) return packing.batchFamily.trim();
  const key = trimmed.toLowerCase();
  const byFamily = catalog.find((p) => p.batchFamily?.trim().toLowerCase() === key);
  if (byFamily?.batchFamily?.trim()) return byFamily.batchFamily.trim();
  return null;
}

export function lotMatchesComponent(
  lot: ReadyLotLike,
  componentName: string,
  catalog: PackingCatalogRow[],
): boolean {
  if (productsMatch(lot.productName, componentName, catalog)) return true;
  const family = batchFamilyForLineName(componentName, catalog);
  if (!family) return false;
  const lotPacking = findPackingByName(lot.productName, catalog);
  const lotFamily = lotPacking?.batchFamily?.trim() || lot.batchProductName?.trim();
  return Boolean(lotFamily && productsMatch(lotFamily, family, catalog));
}

/** Include QC batches from ready shelf when they are not (or partially) in Esha's registry. */
export function augmentPoolWithReadyBatches(
  pool: ProductionBatchPoolItem[],
  lots: ReadyLotLike[],
  catalog: PackingCatalogRow[],
): ProductionBatchPoolItem[] {
  const byKey = new Map<string, ProductionBatchPoolItem>();
  for (const p of pool) {
    const key = batchUsageKey(p.batchNo, p.productName, catalog);
    if (key) byKey.set(key, p);
  }

  const litersByKey = new Map<string, number>();
  for (const lot of lots) {
    if (!lot.batchNo?.trim() || lot.bottles <= 0) continue;
    const packing = findPackingByName(lot.productName, catalog);
    const lp = packing
      ? inferLitersPerBottleFromName(packing.name, packing.litersPerBottle)
      : inferLitersPerBottleFromName(lot.productName);
    const family =
      packing?.batchFamily?.trim() ||
      lot.batchProductName?.trim() ||
      batchFamilyForLineName(lot.productName, catalog) ||
      lot.productName.trim();
    const key = batchUsageKey(lot.batchNo, family, catalog);
    if (!key) continue;
    litersByKey.set(key, roundLiters((litersByKey.get(key) ?? 0) + lot.bottles * lp));
  }

  for (const [key, readyLiters] of litersByKey) {
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        totalLiters: roundLiters(Math.max(existing.totalLiters, readyLiters)),
      });
    } else {
      const [batchNo, ...familyParts] = key.split("::");
      const familyKey = familyParts.join("::");
      const family =
        catalog.find(
          (p) =>
            p.batchFamily?.trim().toLowerCase() === familyKey ||
            p.name.trim().toLowerCase() === familyKey,
        )?.batchFamily?.trim() || familyKey;
      byKey.set(key, {
        batchNo: batchNo ?? "",
        productName: family,
        totalLiters: readyLiters,
      });
    }
  }

  return [...byKey.values()];
}

export type BatchPickerOption = {
  batchNo: string;
  productName: string;
  totalLiters: number;
  readyBottles: number;
  fromReadyOnly: boolean;
};

export function batchPickerOptionsForComponent(
  componentName: string,
  productionPool: ProductionBatchPoolItem[],
  lots: ReadyLotLike[],
  catalog: PackingCatalogRow[],
): BatchPickerOption[] {
  const family = batchFamilyForLineName(componentName, catalog) || componentName.trim();
  const fromProduction = productionPool.filter((pb) => productsMatch(pb.productName, family, catalog));

  const readyByBatch = new Map<string, number>();
  for (const lot of lots) {
    if (!lotMatchesComponent(lot, componentName, catalog)) continue;
    const bn = normalizeBatchNo(lot.batchNo);
    if (!bn) continue;
    readyByBatch.set(bn, (readyByBatch.get(bn) ?? 0) + lot.bottles);
  }

  const byBatch = new Map<string, BatchPickerOption>();
  for (const pb of fromProduction) {
    const bn = normalizeBatchNo(pb.batchNo);
    if (!bn) continue;
    byBatch.set(bn, {
      batchNo: bn,
      productName: pb.productName,
      totalLiters: pb.totalLiters,
      readyBottles: readyByBatch.get(bn) ?? 0,
      fromReadyOnly: false,
    });
    readyByBatch.delete(bn);
  }

  for (const [batchNo, readyBottles] of readyByBatch) {
    const packing = findPackingByName(componentName, catalog);
    const lp = packing
      ? inferLitersPerBottleFromName(packing.name, packing.litersPerBottle)
      : inferLitersPerBottleFromName(componentName);
    byBatch.set(batchNo, {
      batchNo,
      productName: family,
      totalLiters: roundLiters(readyBottles * lp),
      readyBottles,
      fromReadyOnly: true,
    });
  }

  return [...byBatch.values()].sort((a, b) => b.batchNo.localeCompare(a.batchNo));
}

export function remainingLitersForPickerOption(args: {
  option: BatchPickerOption;
  usedElsewhereLiters: number;
  usedOnSheetLiters: number;
  excludeLitersOnSheet: number;
}): number {
  const onSheet = Math.max(0, args.usedOnSheetLiters - args.excludeLitersOnSheet);
  return roundLiters(Math.max(0, args.option.totalLiters - args.usedElsewhereLiters - onSheet));
}

export function formatBatchPickerOptionLabel(
  option: BatchPickerOption,
  remainingLiters: number,
): string {
  if (option.readyBottles > 0) {
    const tail = option.fromReadyOnly ? "" : `, ${formatLiters(remainingLiters)} L left`;
    return `${option.batchNo} (${option.readyBottles} ready${tail})`;
  }
  return `${option.batchNo} (${formatLiters(remainingLiters)} L left)`;
}

/** Stable labels for large trip sheets — avoids rebuilding remaining-L on every keystroke. */
export function formatStaticBatchPickerOptionLabel(option: BatchPickerOption): string {
  if (option.readyBottles > 0) {
    const tail = option.fromReadyOnly ? "" : `, ${formatLiters(option.totalLiters)} L lot`;
    return `${option.batchNo} (${option.readyBottles} ready${tail})`;
  }
  return `${option.batchNo} (${formatLiters(option.totalLiters)} L lot)`;
}

export function buildStaticBatchPickerOptions(
  options: BatchPickerOption[],
): Array<{ batchNo: string; label: string }> {
  return options.map((option) => ({
    batchNo: option.batchNo,
    label: formatStaticBatchPickerOptionLabel(option),
  }));
}

export function isBatchPickerOptionSelectable(
  remainingLiters: number,
  litersNeeded: number,
  optionBatchNo: string,
  selectedBatchNo: string,
): boolean {
  const selected = normalizeBatchNo(selectedBatchNo);
  const option = normalizeBatchNo(optionBatchNo);
  if (selected && selected === option) return true;
  if (litersNeeded <= 1e-9) return remainingLiters > 1e-9;
  return remainingLiters + 1e-9 >= litersNeeded;
}

/** Dropdown options with batches that still have enough liters for this row. */
export function buildSelectableBatchPickerOptions(args: {
  productName: string;
  options: BatchPickerOption[];
  catalog: PackingCatalogRow[];
  usedElsewhereMap: Map<string, number>;
  usedOnSheetMap: Map<string, number>;
  litersNeeded: number;
  selectedBatchNo: string;
}): Array<{ batchNo: string; label: string }> {
  const selectedNorm = normalizeBatchNo(args.selectedBatchNo);
  return args.options
    .map((option) => {
      const key = batchUsageKey(option.batchNo, args.productName, args.catalog);
      const excludeLiters =
        selectedNorm && selectedNorm === normalizeBatchNo(option.batchNo) ? args.litersNeeded : 0;
      const remaining = remainingLitersForPickerOption({
        option,
        usedElsewhereLiters: args.usedElsewhereMap.get(key) ?? 0,
        usedOnSheetLiters: args.usedOnSheetMap.get(key) ?? 0,
        excludeLitersOnSheet: excludeLiters,
      });
      return { option, remaining };
    })
    .filter(({ option, remaining }) =>
      isBatchPickerOptionSelectable(
        remaining,
        args.litersNeeded,
        option.batchNo,
        args.selectedBatchNo,
      ),
    )
    .map(({ option, remaining }) => ({
      batchNo: option.batchNo,
      label: formatBatchPickerOptionLabel(option, remaining),
    }));
}
