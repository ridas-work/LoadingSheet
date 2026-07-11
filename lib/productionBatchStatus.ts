import {
  batchUsageKey,
  formatLiters,
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  productsMatch,
  roundLiters,
  type CatalogProduct,
} from "@/lib/batchVolume";
import {
  findPackingByName,
  lineBatchAllocations,
  type PackingCatalogRow,
  type SheetLineLike,
} from "@/lib/bundleCatalog";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { BatchFillingDailyEntry } from "@/lib/models/BatchFillingDailyEntry";
import { Order } from "@/lib/models/Order";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { ReadyBottleBatchLot } from "@/lib/models/ReadyBottleBatchLot";
import { isBatchClosed } from "@/lib/productionBatchClose";
import { getReadyStockMap } from "@/lib/readyBottleLedger";
import {
  allocateReadyStockToLines,
  createReadyAllocationSharedState,
  type LineReadySplit,
  type ReadyBatchLotInput,
} from "@/lib/readyStockAllocation";
import type { DeductionSheetLine } from "@/lib/packagingDeduction";

export type ProductionBatchStatus = "available" | "in_use" | "empty";

export function isProductionBatchLocked(usedLiters: number): boolean {
  return usedLiters > 0;
}

export function productionBatchStatus(
  totalLiters: number,
  usedLiters: number,
): ProductionBatchStatus {
  if (usedLiters <= 0) return "available";
  const remaining = roundLiters(Math.max(0, totalLiters - usedLiters));
  if (remaining <= 0) return "empty";
  return "in_use";
}

export function statusLabel(status: ProductionBatchStatus, remainingLiters: number): string {
  if (status === "available") return "Available";
  if (status === "empty") return "Empty";
  return `In use (${formatLiters(remainingLiters)} L left)`;
}

export async function loadPackingCatalogForBatchUsage(): Promise<PackingCatalogRow[]> {
  await connectToDatabase();
  const catalogDocs = await ProductPacking.find({ active: true })
    .select({
      code: 1,
      name: 1,
      bottlesPerCarton: 1,
      litersPerBottle: 1,
      aliases: 1,
      batchFamily: 1,
      bundleComponents: 1,
    })
    .lean();
  return packingCatalogFromDocs(catalogDocs);
}

/** @deprecated Use loadPackingCatalogForBatchUsage — kept for callers needing CatalogProduct[] only */
export async function loadCatalogForBatchUsage(): Promise<CatalogProduct[]> {
  const catalog = await loadPackingCatalogForBatchUsage();
  return catalog.map((p) => ({
    name: p.name,
    litersPerBottle: p.litersPerBottle,
    aliases: p.aliases,
    batchFamily: p.batchFamily,
  }));
}

function sheetLinesToDeductionLines(lines: SheetLineLike[]): DeductionSheetLine[] {
  return lines.map((line) => ({
    boxNo: line.boxNo,
    productName: line.productName,
    bottlesPerBox: line.bottlesPerBox,
    lineKind: line.lineKind,
    mixedContents: line.mixedContents,
  }));
}

function litersFromSheetAllocation(
  line: SheetLineLike,
  split: LineReadySplit | undefined,
  catalog: PackingCatalogRow[],
): Array<{ batchNo: string; productName: string; liters: number }> {
  const allocations = lineBatchAllocations(line, catalog);
  const result: Array<{ batchNo: string; productName: string; liters: number }> = [];

  for (const alloc of allocations) {
    let litersToCount = alloc.liters;
    if (split) {
      if (split.components?.length) {
        const comp =
          split.components.find((c) => c.productName.trim() === alloc.productName.trim()) ??
          split.components.find((c) => productsMatch(c.productName, alloc.productName, catalog));
        if (comp) {
          if (comp.bottlesNeedingBatch <= 0) continue;
          if (comp.bottles > 0) {
            litersToCount = roundLiters(alloc.liters * (comp.bottlesNeedingBatch / comp.bottles));
          }
        }
      } else {
        const total = split.bottlesFromReady + split.bottlesNeedingBatch;
        if (split.bottlesNeedingBatch <= 0) continue;
        if (total > 0) {
          litersToCount = roundLiters(alloc.liters * (split.bottlesNeedingBatch / total));
        }
      }
    }
    if (litersToCount <= 0) continue;
    result.push({ batchNo: alloc.batchNo, productName: alloc.productName, liters: litersToCount });
  }

  return result;
}

/**
 * Loading-sheet batch rows that draw from Rashid's ready shelf already consumed Esha
 * liters when the bottles were added to ready stock — count only cartons still needing batch.
 */
export async function accumulateBatchUsageFromSheetLinesForPool(
  orders: Array<{ sheetLines?: SheetLineLike[]; createdAt?: Date | string | null }>,
  catalog: PackingCatalogRow[],
): Promise<Map<string, number>> {
  const readyLotDocs = await ReadyBottleBatchLot.find({ nimraLinked: true, bottles: { $gt: 0 } })
    .select({ batchNo: 1, productCode: 1, bottles: 1, createdAt: 1 })
    .lean();
  const batchLots: ReadyBatchLotInput[] = readyLotDocs.map((lot) => ({
    batchNo: lot.batchNo,
    productCode: lot.productCode,
    bottles: lot.bottles,
    createdAt: lot.createdAt ? new Date(lot.createdAt).toISOString() : null,
  }));
  const onHand = await getReadyStockMap();
  const sharedState = createReadyAllocationSharedState(onHand, batchLots, catalog);
  const used = new Map<string, number>();

  const sortedOrders = [...orders].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });

  for (const order of sortedOrders) {
    const lines = order.sheetLines ?? [];
    if (lines.length === 0) continue;

    const { byBoxNo } = allocateReadyStockToLines(
      sheetLinesToDeductionLines(lines),
      catalog,
      onHand,
      batchLots,
      sharedState,
    );

    for (const line of lines) {
      const split = byBoxNo.get(line.boxNo);
      for (const alloc of litersFromSheetAllocation(line, split, catalog)) {
        const key = batchUsageKey(alloc.batchNo, alloc.productName, catalog);
        if (!key) continue;
        used.set(key, roundLiters((used.get(key) ?? 0) + alloc.liters));
      }
    }
  }

  return used;
}

export async function loadBatchUsageMap(catalog: PackingCatalogRow[]) {
  await connectToDatabase();
  const orders = await Order.find({}).select({ sheetLines: 1, createdAt: 1 }).lean();
  const fromSheets = await accumulateBatchUsageFromSheetLinesForPool(orders, catalog);
  const fromReady = await accumulateBatchUsageFromReadyLots(catalog);
  const fromFilling = await accumulateBatchUsageFromFillingEntries(catalog);

  // Ready lots (Rashid shelf stock) always consume Esha batch liters. Daily filling
  // "filled today" only counts when no ready lots exist for that batch key — avoids
  // double-counting when filling sync also created nimra-linked ready lots.
  const batchesWithReadyLots = new Set(fromReady.keys());
  const merged = new Map<string, number>();

  for (const [key, liters] of fromSheets) {
    merged.set(key, roundLiters(liters));
  }
  for (const [key, liters] of fromReady) {
    merged.set(key, roundLiters((merged.get(key) ?? 0) + liters));
  }
  for (const [key, liters] of fromFilling) {
    if (batchesWithReadyLots.has(key)) continue;
    merged.set(key, roundLiters((merged.get(key) ?? 0) + liters));
  }

  return merged;
}

/** Nimra-linked ready stock drawn from a production batch pool. */
export async function accumulateBatchUsageFromReadyLots(
  catalog: PackingCatalogRow[],
): Promise<Map<string, number>> {
  const lots = await ReadyBottleBatchLot.find({ nimraLinked: true, bottles: { $gt: 0 } }).lean();
  const used = new Map<string, number>();

  for (const lot of lots) {
    const batchNo = lot.batchNo?.trim();
    if (!batchNo) continue;
    const poolProduct = lot.batchProductName?.trim() || lot.productName?.trim() || "";
    const packing =
      findPackingByName(lot.productName, catalog) ??
      (poolProduct ? findPackingByName(poolProduct, catalog) : null);
    const litersPerBottle = packing
      ? inferLitersPerBottleFromName(packing.name, packing.litersPerBottle)
      : inferLitersPerBottleFromName(lot.productName);
    const liters = roundLiters(lot.bottles * litersPerBottle);
    const key = batchUsageKey(batchNo, poolProduct || lot.productName, catalog);
    if (!key) continue;
    used.set(key, roundLiters((used.get(key) ?? 0) + liters));
  }

  return used;
}

/** Bottles filled from batch via Rashid's daily filling sheet (when used instead of direct lot add). */
export async function accumulateBatchUsageFromFillingEntries(
  catalog: PackingCatalogRow[],
): Promise<Map<string, number>> {
  const [entries, batches] = await Promise.all([
    BatchFillingDailyEntry.find({}).select({ batchNo: 1, packingLines: 1 }).lean(),
    ProductionBatch.find({}).select({ batchNo: 1, productName: 1 }).lean(),
  ]);
  const productByBatch = new Map(
    batches.map((b) => [normalizeBatchNo(b.batchNo).toLowerCase(), b.productName?.trim() ?? ""]),
  );
  const used = new Map<string, number>();

  for (const entry of entries) {
    const batchNo = entry.batchNo?.trim();
    if (!batchNo) continue;

    const poolProduct = productByBatch.get(normalizeBatchNo(batchNo).toLowerCase()) ?? "";
    let filledLiters = 0;

    for (const line of entry.packingLines ?? []) {
      const snapshot =
        typeof line.filledLitersTodaySnapshot === "number"
          ? line.filledLitersTodaySnapshot
          : roundLiters((line.filledBottlesToday ?? 0) * (line.litersPerBottle ?? 0));
      filledLiters = roundLiters(filledLiters + snapshot);
    }

    if (filledLiters <= 0) continue;
    const key = batchUsageKey(batchNo, poolProduct, catalog);
    if (!key) continue;
    used.set(key, roundLiters((used.get(key) ?? 0) + filledLiters));
  }

  return used;
}

export function usageForBatchNo(
  batchNo: string,
  totalLiters: number,
  usedMap: Map<string, number>,
  productName?: string,
  catalog?: CatalogProduct[],
  options?: { closed?: boolean },
) {
  const key =
    productName?.trim() && catalog?.length
      ? batchUsageKey(batchNo, productName, catalog)
      : normalizeBatchNo(batchNo).toLowerCase();
  const usedLiters = usedMap.get(key) ?? 0;
  if (options?.closed) {
    return {
      usedLiters,
      remainingLiters: 0,
      status: "empty" as ProductionBatchStatus,
      locked: false,
    };
  }
  const remainingLiters = roundLiters(Math.max(0, totalLiters - usedLiters));
  const status = productionBatchStatus(totalLiters, usedLiters);
  return {
    usedLiters,
    remainingLiters,
    status,
    locked: isProductionBatchLocked(usedLiters),
  };
}

export function usageForProductionBatch(
  batch: {
    batchNo: string;
    totalLiters: number;
    productName?: string;
    closedAt?: Date | string | null;
  },
  usedMap: Map<string, number>,
  catalog?: CatalogProduct[],
) {
  return usageForBatchNo(
    batch.batchNo,
    batch.totalLiters,
    usedMap,
    batch.productName,
    catalog,
    { closed: isBatchClosed(batch) },
  );
}

export async function loadBatchUsageContext() {
  const catalog = await loadPackingCatalogForBatchUsage();
  const usedMap = await loadBatchUsageMap(catalog);
  return { catalog, usedMap };
}
