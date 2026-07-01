import {
  batchUsageKey,
  formatLiters,
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  roundLiters,
  type CatalogProduct,
} from "@/lib/batchVolume";
import {
  accumulateBatchUsageFromSheetLines,
  findPackingByName,
  type PackingCatalogRow,
} from "@/lib/bundleCatalog";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { BatchFillingDailyEntry } from "@/lib/models/BatchFillingDailyEntry";
import { Order } from "@/lib/models/Order";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { ReadyBottleBatchLot } from "@/lib/models/ReadyBottleBatchLot";
import { isBatchClosed } from "@/lib/productionBatchClose";

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

export async function loadBatchUsageMap(catalog: PackingCatalogRow[]) {
  await connectToDatabase();
  const orders = await Order.find({}).select({ sheetLines: 1 }).lean();
  const fromSheets = accumulateBatchUsageFromSheetLines(orders, catalog);
  const fromReady = await accumulateBatchUsageFromReadyLots(catalog);
  const fromFilling = await accumulateBatchUsageFromFillingEntries(catalog);

  const batchesWithFilling = new Set(fromFilling.keys());
  const merged = new Map<string, number>();

  for (const [key, liters] of fromSheets) {
    merged.set(key, roundLiters(liters));
  }
  for (const [key, liters] of fromFilling) {
    merged.set(key, roundLiters((merged.get(key) ?? 0) + liters));
  }
  for (const [key, liters] of fromReady) {
    if (batchesWithFilling.has(key)) continue;
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
