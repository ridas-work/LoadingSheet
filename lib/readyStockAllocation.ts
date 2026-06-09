import { isMixedSampleLine } from "@/lib/mixedSampleBox";
import type { DeductionPacking, DeductionSheetLine } from "@/lib/packagingDeduction";
import {
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  productsMatch,
  roundLiters,
} from "@/lib/batchVolume";
import type { PackingCatalogRow, SheetLineLike } from "@/lib/bundleCatalog";
import {
  findPackingByName,
  isBundleProduct,
  resolveBundleParts,
  type ComponentBatch,
} from "@/lib/bundleCatalog";
import { resolveMixedSampleParts } from "@/lib/mixedSampleBox";

export const READY_SHELF_LABEL = "Ready shelf";

export type ReadyBatchLotInput = {
  batchNo: string;
  productCode: string;
  bottles: number;
  createdAt?: string | null;
};

export type ComponentReadySplit = {
  productCode: string;
  productName: string;
  bottles: number;
  bottlesFromReady: number;
  bottlesNeedingBatch: number;
  readyBatchDisplay?: string;
};

export type LineReadySplit = {
  boxNo: number;
  bottlesFromReady: number;
  bottlesNeedingBatch: number;
  readyBatchDisplay?: string;
  components?: ComponentReadySplit[];
};

export type ProductReadySummary = {
  productCode: string;
  productName: string;
  totalNeed: number;
  fromReady: number;
  needingBatch: number;
};

function productKey(code: string): string {
  return code.trim().toLowerCase();
}

function stockMap(input: Map<string, number> | Record<string, number>): Map<string, number> {
  if (input instanceof Map) return new Map(input);
  return new Map(Object.entries(input).map(([k, v]) => [productKey(k), v]));
}

function findPackingDeduction(name: string, catalog: DeductionPacking[]): DeductionPacking | null {
  const k = name.trim().toLowerCase();
  if (!k) return null;
  return (
    catalog.find((p) => p.name.trim().toLowerCase() === k) ??
    catalog.find((p) => (p.aliases ?? []).some((a) => a.trim().toLowerCase() === k)) ??
    null
  );
}

type LineBottleUnit = {
  boxNo: number;
  productCode: string;
  productName: string;
  bottles: number;
  componentKey?: string;
};

function lineBottleUnits(line: DeductionSheetLine, catalog: DeductionPacking[]): LineBottleUnit[] {
  const boxNo = line.boxNo ?? 0;

  if (isMixedSampleLine(line) && line.mixedContents?.length) {
    const units: LineBottleUnit[] = [];
    for (const part of line.mixedContents) {
      const packing = findPackingDeduction(part.productName, catalog);
      if (!packing) continue;
      units.push({
        boxNo,
        productCode: productKey(packing.code),
        productName: packing.name,
        bottles: part.bottles,
        componentKey: part.productName.trim(),
      });
    }
    return units;
  }

  const packing = findPackingDeduction(line.productName, catalog);
  if (!packing) return [];

  if (packing.bundleComponents?.length) {
    const units: LineBottleUnit[] = [];
    for (const ref of packing.bundleComponents) {
      const partPacking = catalog.find((p) => productKey(p.code) === productKey(ref.code));
      if (!partPacking) continue;
      units.push({
        boxNo,
        productCode: productKey(partPacking.code),
        productName: partPacking.name,
        bottles: line.bottlesPerBox * ref.bottlesPerUnit,
        componentKey: partPacking.name,
      });
    }
    return units;
  }

  return [
    {
      boxNo,
      productCode: productKey(packing.code),
      productName: packing.name,
      bottles: line.bottlesPerBox,
    },
  ];
}

type LotPoolEntry = { batchNo: string; remaining: number };

function buildLotPools(
  batchLots: ReadyBatchLotInput[] | undefined,
): Map<string, LotPoolEntry[]> {
  const pools = new Map<string, LotPoolEntry[]>();
  if (!batchLots?.length) return pools;

  const sorted = [...batchLots].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (ta !== tb) return ta - tb;
    return a.batchNo.localeCompare(b.batchNo);
  });

  for (const lot of sorted) {
    if (!lot.batchNo?.trim() || lot.bottles <= 0) continue;
    const code = productKey(lot.productCode);
    const list = pools.get(code) ?? [];
    list.push({ batchNo: normalizeBatchNo(lot.batchNo), remaining: lot.bottles });
    pools.set(code, list);
  }

  return pools;
}

function consumeFromLotPool(
  pools: Map<string, LotPoolEntry[]>,
  productCode: string,
  count: number,
): string[] {
  if (count <= 0) return [];
  const pool = pools.get(productCode);
  if (!pool?.length) return [];

  const batchNos: string[] = [];
  let left = count;

  while (left > 0 && pool.length > 0) {
    const lot = pool[0];
    const take = Math.min(left, lot.remaining);
    if (take > 0 && lot.batchNo) {
      if (batchNos[batchNos.length - 1] !== lot.batchNo) {
        batchNos.push(lot.batchNo);
      }
    }
    lot.remaining -= take;
    left -= take;
    if (lot.remaining <= 0) pool.shift();
  }

  return batchNos;
}

export function formatReadyBatchLabels(batchNos: string[]): string {
  const unique = [...new Set(batchNos.map((b) => normalizeBatchNo(b)).filter(Boolean))];
  if (unique.length === 0) return READY_SHELF_LABEL;
  return unique.join(" / ");
}

export function allocateReadyStockToLines(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
  onHandByProductCode: Map<string, number> | Record<string, number>,
  batchLots?: ReadyBatchLotInput[],
): {
  byBoxNo: Map<number, LineReadySplit>;
  productSummary: ProductReadySummary[];
} {
  const onHand = stockMap(onHandByProductCode);
  const remaining = new Map(onHand);
  const lotPools = buildLotPools(batchLots);
  const byBoxNo = new Map<number, LineReadySplit>();
  const productTotals = new Map<string, ProductReadySummary>();

  const sorted = [...sheetLines].sort((a, b) => (a.boxNo ?? 0) - (b.boxNo ?? 0));

  for (const line of sorted) {
    const units = lineBottleUnits(line, catalog);
    const boxNo = line.boxNo ?? 0;
    const lineBatchNos: string[] = [];
    const lineSplit: LineReadySplit = {
      boxNo,
      bottlesFromReady: 0,
      bottlesNeedingBatch: 0,
      components: units.some((u) => u.componentKey) ? [] : undefined,
    };

    for (const unit of units) {
      const pool = remaining.get(unit.productCode) ?? 0;
      const fromReady = Math.min(pool, unit.bottles);
      const needingBatch = unit.bottles - fromReady;
      remaining.set(unit.productCode, pool - fromReady);
      const readyBatchNos = consumeFromLotPool(lotPools, unit.productCode, fromReady);
      const readyBatchDisplay = formatReadyBatchLabels(readyBatchNos);

      lineSplit.bottlesFromReady += fromReady;
      lineSplit.bottlesNeedingBatch += needingBatch;
      if (fromReady > 0) {
        for (const batchNo of readyBatchNos) {
          if (lineBatchNos[lineBatchNos.length - 1] !== batchNo) {
            lineBatchNos.push(batchNo);
          }
        }
      }

      if (lineSplit.components && unit.componentKey) {
        lineSplit.components.push({
          productCode: unit.productCode,
          productName: unit.productName,
          bottles: unit.bottles,
          bottlesFromReady: fromReady,
          bottlesNeedingBatch: needingBatch,
          readyBatchDisplay: fromReady > 0 ? readyBatchDisplay : undefined,
        });
      }

      const summary = productTotals.get(unit.productCode) ?? {
        productCode: unit.productCode,
        productName: unit.productName,
        totalNeed: 0,
        fromReady: 0,
        needingBatch: 0,
      };
      summary.totalNeed += unit.bottles;
      summary.fromReady += fromReady;
      summary.needingBatch += needingBatch;
      productTotals.set(unit.productCode, summary);
    }

    if (lineSplit.bottlesFromReady > 0) {
      lineSplit.readyBatchDisplay = formatReadyBatchLabels(lineBatchNos);
    }

    byBoxNo.set(boxNo, lineSplit);
  }

  const productSummary = [...productTotals.values()].sort((a, b) =>
    a.productName.localeCompare(b.productName),
  );

  return { byBoxNo, productSummary };
}

export function lineUsesComponentBatches(
  line: SheetLineLike,
  catalog: PackingCatalogRow[],
): boolean {
  return isMixedSampleLine(line) || isBundleProduct(line.productName, catalog);
}

export function componentNeedsBatch(
  line: SheetLineLike,
  productName: string,
  readyByBox: Map<number, LineReadySplit>,
  catalog: PackingCatalogRow[],
): boolean {
  const split = readyByBox.get(line.boxNo);
  if (!split?.components?.length) {
    return (split?.bottlesNeedingBatch ?? line.bottlesPerBox) > 0;
  }
  const hit =
    split.components.find((c) => c.productName.trim() === productName.trim()) ??
    split.components.find((c) => productsMatch(c.productName, productName, catalog));
  return (hit?.bottlesNeedingBatch ?? 0) > 0;
}

export function lineNeedsBatch(
  line: SheetLineLike,
  readyByBox: Map<number, LineReadySplit>,
  catalog: PackingCatalogRow[],
): boolean {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = isMixedSampleLine(line)
      ? resolveMixedSampleParts(line, catalog)
      : resolveBundleParts(line.productName, catalog);
    return parts.some((part) => componentNeedsBatch(line, part.productName, readyByBox, catalog));
  }
  const split = readyByBox.get(line.boxNo);
  return (split?.bottlesNeedingBatch ?? line.bottlesPerBox) > 0;
}

export function lineBatchCompleteWithReady(
  line: SheetLineLike,
  catalog: PackingCatalogRow[],
  readyByBox: Map<number, LineReadySplit>,
): boolean {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = isMixedSampleLine(line)
      ? resolveMixedSampleParts(line, catalog)
      : resolveBundleParts(line.productName, catalog);
    if (parts.length === 0) return false;
    return parts.every((part) => {
      if (!componentNeedsBatch(line, part.productName, readyByBox, catalog)) return true;
      const hit =
        line.componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
        line.componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
      return Boolean(hit?.batchNo?.trim());
    });
  }

  if (!lineNeedsBatch(line, readyByBox, catalog)) return true;
  return Boolean(line.batchNo?.trim());
}

/** Total liquid liters in a carton row (all bottles), regardless of ready vs Nimra source. */
export function computeSheetLineLiters(line: SheetLineLike, catalog: PackingCatalogRow[]): number | null {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = isMixedSampleLine(line)
      ? resolveMixedSampleParts(line, catalog)
      : resolveBundleParts(line.productName, catalog);
    if (parts.length === 0) return null;

    let total = 0;
    for (const part of parts) {
      const bottles = isMixedSampleLine(line)
        ? part.bottlesPerUnit
        : line.bottlesPerBox * part.bottlesPerUnit;
      total += roundLiters(bottles * part.litersPerBottle);
    }
    return roundLiters(total);
  }

  const packing = findPackingByName(line.productName, catalog);
  const lp = packing
    ? inferLitersPerBottleFromName(packing.name, packing.litersPerBottle)
    : inferLitersPerBottleFromName(line.productName);
  if (line.bottlesPerBox <= 0 || lp <= 0) return null;
  return roundLiters(line.bottlesPerBox * lp);
}

export function computeSheetLineWeights(
  lines: SheetLineLike[],
  catalog: PackingCatalogRow[],
): Map<number, number | null> {
  const weights = new Map<number, number | null>();
  for (const line of lines) {
    weights.set(line.boxNo, computeSheetLineLiters(line, catalog));
  }
  return weights;
}

export function enrichWeightsWithReadyShelf(
  lines: SheetLineLike[],
  catalog: PackingCatalogRow[],
  weights: Map<number, number | null>,
  _readyByBox: Map<number, LineReadySplit>,
): Map<number, number | null> {
  const catalogWeights = computeSheetLineWeights(lines, catalog);
  const result = new Map(weights);
  for (const [boxNo, liters] of catalogWeights) {
    if (liters != null) result.set(boxNo, liters);
  }
  return result;
}

export function formatReadyAwareBatchDisplay(
  line: SheetLineLike,
  catalog: PackingCatalogRow[],
  readyByBox: Map<number, LineReadySplit>,
  batchNo?: string | null,
  componentBatches?: ComponentBatch[] | null,
): string {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = isMixedSampleLine(line)
      ? resolveMixedSampleParts(line, catalog)
      : resolveBundleParts(line.productName, catalog);
    const split = readyByBox.get(line.boxNo);
    const labels = parts.map((part) => {
      if (!componentNeedsBatch(line, part.productName, readyByBox, catalog)) {
        const comp = split?.components?.find((c) => productsMatch(c.productName, part.productName, catalog));
        return comp?.readyBatchDisplay || READY_SHELF_LABEL;
      }
      const hit =
        componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
        componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
      return normalizeBatchNo(hit?.batchNo ?? "");
    });
    const nonEmpty = labels.filter(Boolean);
    if (nonEmpty.length === 0) return "";
    const shelfOnly = nonEmpty.every((l) => l === READY_SHELF_LABEL);
    if (shelfOnly) return READY_SHELF_LABEL;
    return nonEmpty.join(" / ");
  }

  if (!lineNeedsBatch(line, readyByBox, catalog)) {
    const split = readyByBox.get(line.boxNo);
    if (split && split.bottlesFromReady > 0) {
      return split.readyBatchDisplay || READY_SHELF_LABEL;
    }
  }

  return normalizeBatchNo(batchNo ?? line.batchNo ?? "");
}

export function validateReadyBatchRequirements(
  lines: SheetLineLike[],
  catalog: PackingCatalogRow[],
  readyByBox: Map<number, LineReadySplit>,
): { ok: true } | { ok: false; error: string } {
  for (const line of lines) {
    if (lineUsesComponentBatches(line, catalog)) {
      const parts = isMixedSampleLine(line)
        ? resolveMixedSampleParts(line, catalog)
        : resolveBundleParts(line.productName, catalog);
      for (const part of parts) {
        if (!componentNeedsBatch(line, part.productName, readyByBox, catalog)) continue;
        const hit =
          line.componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
          line.componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
        if (!hit?.batchNo?.trim()) {
          return {
            ok: false,
            error: `Box ${line.boxNo} — assign a QC batch for ${part.productName} (${line.productName}). Ready shelf covers the rest of this PO.`,
          };
        }
      }
      continue;
    }

    if (!lineNeedsBatch(line, readyByBox, catalog)) continue;
    if (!line.batchNo?.trim()) {
      return {
        ok: false,
        error: `Box ${line.boxNo} — assign a QC batch for ${line.productName}. Ready shelf covers the other cartons for this product.`,
      };
    }
  }

  return { ok: true };
}
