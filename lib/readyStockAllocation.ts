import { composeCustomLineProductName, isDrumContainerProduct } from "@/lib/customBottleSizes";
import { batchFamilyForLineName } from "@/lib/readyBatchPool";
import { batchProductMatchKey } from "@/lib/batchProductMatch";
import { isMixedSampleLine } from "@/lib/mixedSampleBox";
import { findPackingForLineName, familyKeyForLineName, familyStockKey } from "@/lib/productPackingMatch";
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

function findPackingDeduction(
  name: string,
  catalog: DeductionPacking[],
  context?: { parentLineName?: string },
): DeductionPacking | null {
  return findPackingForLineName(name, catalog, context) as DeductionPacking | null;
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
      const sizeCode = (part as { bottleSizeCode?: string }).bottleSizeCode;
      if (isDrumContainerProduct(part.productName, sizeCode)) continue;
      const lookupName =
        sizeCode?.trim() && sizeCode !== "catalog"
          ? composeCustomLineProductName(part.productName, sizeCode)
          : part.productName;
      const packing = findPackingDeduction(lookupName, catalog, { parentLineName: line.productName });
      if (packing) {
        units.push({
          boxNo,
          productCode: productKey(packing.code),
          productName: packing.name,
          bottles: part.bottles,
          componentKey: part.productName.trim(),
        });
        continue;
      }
      const family =
        batchFamilyForLineName(part.productName, catalog as PackingCatalogRow[]) ??
        familyKeyForLineName(part.productName, catalog);
      if (family) {
        units.push({
          boxNo,
          productCode: familyStockKey(family),
          productName: part.productName.trim(),
          bottles: part.bottles,
          componentKey: part.productName.trim(),
        });
        continue;
      }
      // Custom carton / drum products not in bottle catalog still need Nimra batches.
      units.push({
        boxNo,
        productCode: batchProductMatchKey(part.productName) || part.productName.trim().toLowerCase(),
        productName: part.productName.trim(),
        bottles: part.bottles,
        componentKey: part.productName.trim(),
      });
    }
    return units;
  }

  const packing = findPackingDeduction(line.productName, catalog);
  if (!packing) {
    if (isDrumContainerProduct(line.productName)) return [];
    if ((line.bottlesPerBox ?? 0) > 0 && line.productName?.trim()) {
      return [
        {
          boxNo,
          productCode: batchProductMatchKey(line.productName) || line.productName.trim().toLowerCase(),
          productName: line.productName.trim(),
          bottles: line.bottlesPerBox,
        },
      ];
    }
    return [];
  }

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

export type LotPoolEntry = { batchNo: string; remaining: number };

export type ReadyLotDeduction = {
  productCode: string;
  batchNo: string;
  bottles: number;
};

export function buildLotPools(
  batchLots: ReadyBatchLotInput[] | undefined,
  catalog: DeductionPacking[],
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
    const entry = { batchNo: normalizeBatchNo(lot.batchNo), remaining: lot.bottles };
    const list = pools.get(code) ?? [];
    list.push(entry);
    pools.set(code, list);

    const packing = catalog.find((p) => productKey(p.code) === code);
    const family = packing?.batchFamily?.trim().toLowerCase();
    if (family) {
      const fKey = familyStockKey(family);
      const flist = pools.get(fKey) ?? [];
      flist.push({ ...entry });
      pools.set(fKey, flist);
    }
  }

  return pools;
}

function onHandForUnit(
  unit: LineBottleUnit,
  remaining: Map<string, number>,
  catalog: DeductionPacking[],
): number {
  if (unit.productCode.startsWith("family:")) {
    const fam = unit.productCode.slice("family:".length);
    let total = 0;
    for (const p of catalog) {
      if (p.batchFamily?.trim().toLowerCase() === fam) {
        total += remaining.get(productKey(p.code)) ?? 0;
      }
    }
    return total;
  }
  return remaining.get(unit.productCode) ?? 0;
}

function consumeFamilyReadyStock(
  unit: LineBottleUnit,
  remaining: Map<string, number>,
  lotPools: Map<string, LotPoolEntry[]>,
  catalog: DeductionPacking[],
  lotDeductions: ReadyLotDeduction[],
): { fromReady: number; batchNos: string[] } {
  const fam = unit.productCode.slice("family:".length);
  const familyCodes = catalog
    .filter((p) => p.batchFamily?.trim().toLowerCase() === fam)
    .map((p) => productKey(p.code));

  let need = unit.bottles;
  let fromReady = 0;
  const batchNos: string[] = [];

  for (const code of familyCodes) {
    while (need > 0) {
      const pool = remaining.get(code) ?? 0;
      if (pool <= 0) break;
      const take = Math.min(need, pool);
      remaining.set(code, pool - take);
      fromReady += take;
      need -= take;
      const amounts = consumeLotPoolAmounts(lotPools, code, take);
      recordLotDeductions(lotDeductions, code, amounts);
      for (const { batchNo } of amounts) {
        if (batchNos[batchNos.length - 1] !== batchNo) batchNos.push(batchNo);
      }
    }
    if (need <= 0) break;
  }

  return { fromReady, batchNos };
}

/** FIFO consumption from in-memory lot pools; mutates pools. */
export function consumeLotPoolAmounts(
  pools: Map<string, LotPoolEntry[]>,
  productCode: string,
  count: number,
): Array<{ batchNo: string; bottles: number }> {
  if (count <= 0) return [];
  const pool = pools.get(productCode);
  if (!pool?.length) return [];

  const amounts: Array<{ batchNo: string; bottles: number }> = [];
  let left = count;

  while (left > 0 && pool.length > 0) {
    const lot = pool[0];
    const take = Math.min(left, lot.remaining);
    if (take > 0 && lot.batchNo) {
      amounts.push({ batchNo: lot.batchNo, bottles: take });
    }
    lot.remaining -= take;
    left -= take;
    if (lot.remaining <= 0) pool.shift();
  }

  return amounts;
}

function consumeFromLotPool(
  pools: Map<string, LotPoolEntry[]>,
  productCode: string,
  count: number,
): string[] {
  const amounts = consumeLotPoolAmounts(pools, productCode, count);
  const batchNos: string[] = [];
  for (const { batchNo } of amounts) {
    if (batchNos[batchNos.length - 1] !== batchNo) batchNos.push(batchNo);
  }
  return batchNos;
}

function recordLotDeductions(
  target: ReadyLotDeduction[],
  productCode: string,
  amounts: Array<{ batchNo: string; bottles: number }>,
): void {
  for (const { batchNo, bottles } of amounts) {
    if (bottles <= 0 || !batchNo) continue;
    const code = productKey(productCode);
    const hit = target.find((d) => d.productCode === code && d.batchNo === batchNo);
    if (hit) hit.bottles += bottles;
    else target.push({ productCode: code, batchNo, bottles });
  }
}

export function formatReadyBatchLabels(batchNos: string[]): string {
  const unique = [...new Set(batchNos.map((b) => normalizeBatchNo(b)).filter(Boolean))];
  if (unique.length === 0) return READY_SHELF_LABEL;
  return unique.join(" / ");
}

export type ReadyAllocationSharedState = {
  remaining: Map<string, number>;
  lotPools: Map<string, LotPoolEntry[]>;
};

export function createReadyAllocationSharedState(
  onHandByProductCode: Map<string, number> | Record<string, number>,
  batchLots: ReadyBatchLotInput[] | undefined,
  catalog: DeductionPacking[],
): ReadyAllocationSharedState {
  return {
    remaining: stockMap(onHandByProductCode),
    lotPools: buildLotPools(batchLots, catalog),
  };
}

export function allocateReadyStockToLines(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
  onHandByProductCode: Map<string, number> | Record<string, number>,
  batchLots?: ReadyBatchLotInput[],
  sharedState?: ReadyAllocationSharedState,
): {
  byBoxNo: Map<number, LineReadySplit>;
  productSummary: ProductReadySummary[];
  lotDeductions: ReadyLotDeduction[];
} {
  const remaining = sharedState?.remaining ?? new Map(stockMap(onHandByProductCode));
  const lotPools = sharedState?.lotPools ?? buildLotPools(batchLots, catalog);
  const byBoxNo = new Map<number, LineReadySplit>();
  const productTotals = new Map<string, ProductReadySummary>();
  const lotDeductions: ReadyLotDeduction[] = [];

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
      if (unit.productCode.startsWith("family:")) {
        const familyTake = consumeFamilyReadyStock(unit, remaining, lotPools, catalog, lotDeductions);
        const fromReady = familyTake.fromReady;
        const needingBatch = unit.bottles - fromReady;
        const readyBatchNos = familyTake.batchNos;
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

        const summaryKey = unit.componentKey?.trim().toLowerCase() || unit.productCode;
        const summary = productTotals.get(summaryKey) ?? {
          productCode: unit.productCode,
          productName: unit.productName,
          totalNeed: 0,
          fromReady: 0,
          needingBatch: 0,
        };
        summary.totalNeed += unit.bottles;
        summary.fromReady += fromReady;
        summary.needingBatch += needingBatch;
        productTotals.set(summaryKey, summary);
        continue;
      }

      const pool = onHandForUnit(unit, remaining, catalog);
      const fromReady = Math.min(pool, unit.bottles);
      const needingBatch = unit.bottles - fromReady;
      if (!unit.productCode.startsWith("family:")) {
        remaining.set(unit.productCode, pool - fromReady);
      }
      const lotAmounts = consumeLotPoolAmounts(lotPools, unit.productCode, fromReady);
      recordLotDeductions(lotDeductions, unit.productCode, lotAmounts);
      const readyBatchNos = lotAmounts.map((a) => a.batchNo).filter((bn, i, arr) => i === 0 || arr[i - 1] !== bn);
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

  return { byBoxNo, productSummary, lotDeductions };
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
    if ((split?.bottlesNeedingBatch ?? 0) > 0) return true;
    if ((split?.bottlesFromReady ?? 0) > 0) return false;
    return line.bottlesPerBox > 0;
  }
  const hit =
    split.components.find((c) => c.productName.trim() === productName.trim()) ??
    split.components.find((c) => productsMatch(c.productName, productName, catalog));
  if ((hit?.bottlesNeedingBatch ?? 0) > 0) return true;
  if ((hit?.bottlesFromReady ?? 0) > 0) return false;
  const part = (isMixedSampleLine(line) ? line.mixedContents : null)?.find(
    (c) => c.productName.trim() === productName.trim(),
  );
  return (part?.bottles ?? 0) > 0;
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
  if ((split?.bottlesNeedingBatch ?? 0) > 0) return true;
  if ((split?.bottlesFromReady ?? 0) > 0) return false;
  return line.bottlesPerBox > 0;
}

export function lineBatchCompleteWithReady(
  line: SheetLineLike,
  catalog: PackingCatalogRow[],
  _readyByBox: Map<number, LineReadySplit>,
): boolean {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = isMixedSampleLine(line)
      ? resolveMixedSampleParts(line, catalog)
      : resolveBundleParts(line.productName, catalog);
    if (parts.length === 0) return false;
    return parts.every((part, index) => {
      if ((part.bottlesPerUnit ?? 0) <= 0) return true;
      const hit =
        line.componentBatches?.[index] ??
        line.componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
        line.componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
      return Boolean(hit?.batchNo?.trim());
    });
  }

  if (line.bottlesPerBox <= 0) return true;
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
  _readyByBox: Map<number, LineReadySplit>,
  batchNo?: string | null,
  componentBatches?: ComponentBatch[] | null,
): string {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = isMixedSampleLine(line)
      ? resolveMixedSampleParts(line, catalog)
      : resolveBundleParts(line.productName, catalog);
    const labels = parts.map((part, index) => {
      const hit =
        componentBatches?.[index] ??
        componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
        componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
      return normalizeBatchNo(hit?.batchNo ?? "");
    });
    return labels.filter(Boolean).join(" / ");
  }

  return normalizeBatchNo(batchNo ?? line.batchNo ?? "");
}

export function validateReadyBatchRequirements(
  lines: SheetLineLike[],
  catalog: PackingCatalogRow[],
  _readyByBox: Map<number, LineReadySplit>,
): { ok: true } | { ok: false; error: string } {
  for (const line of lines) {
    if (lineUsesComponentBatches(line, catalog)) {
      const parts = isMixedSampleLine(line)
        ? resolveMixedSampleParts(line, catalog)
        : resolveBundleParts(line.productName, catalog);
      for (let index = 0; index < parts.length; index++) {
        const part = parts[index];
        if ((part.bottlesPerUnit ?? 0) <= 0) continue;
        const hit =
          line.componentBatches?.[index] ??
          line.componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
          line.componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
        if (!hit?.batchNo?.trim()) {
          return {
            ok: false,
            error: `Box ${line.boxNo} — assign a batch for ${part.productName} (${line.productName}).`,
          };
        }
      }
      continue;
    }

    if (line.bottlesPerBox > 0 && !line.batchNo?.trim()) {
      return {
        ok: false,
        error: `Box ${line.boxNo} — assign a batch for ${line.productName}.`,
      };
    }
  }

  return { ok: true };
}
