import {
  batchUsageKey,
  formatLiters,
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  productsMatch,
  roundLiters,
  type CatalogProduct,
} from "@/lib/batchVolume";
import { findPackingByName, type PackingCatalogRow } from "@/lib/bundleCatalog";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ReadyBottleBatchLot } from "@/lib/models/ReadyBottleBatchLot";
import { isBatchClosed } from "@/lib/productionBatchClose";
import { loadBatchUsageContext, usageForBatchNo } from "@/lib/productionBatchStatus";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type NimraBatchRef = {
  batchNo: string;
  productName: string;
  totalLiters: number;
  closedAt?: Date | string | null;
};

export function litersForReadyBottles(
  bottles: number,
  productName: string,
  catalog: PackingCatalogRow[],
): number {
  if (bottles <= 0) return 0;
  const packing = findPackingByName(productName, catalog);
  const litersPerBottle = packing
    ? inferLitersPerBottleFromName(packing.name, packing.litersPerBottle)
    : inferLitersPerBottleFromName(productName);
  return roundLiters(bottles * litersPerBottle);
}

/** Case-insensitive batch label lookup; prefers product match when multiple QC rows share a label. */
export async function findProductionBatchForReadyLot(
  batchNo: string,
  productName?: string,
  catalog?: CatalogProduct[],
): Promise<NimraBatchRef | null> {
  const normalized = normalizeBatchNo(batchNo);
  if (!normalized) return null;

  await connectToDatabase();
  const escaped = escapeRegex(normalized);
  const batches = await ProductionBatch.find({
    batchNo: { $regex: `^${escaped}$`, $options: "i" },
  })
    .select({ batchNo: 1, productName: 1, totalLiters: 1, closedAt: 1 })
    .lean();

  if (batches.length === 0) return null;
  if (batches.length === 1) {
    const b = batches[0]!;
    return {
      batchNo: b.batchNo,
      productName: b.productName?.trim() ?? "",
      totalLiters: b.totalLiters,
      closedAt: b.closedAt,
    };
  }

  if (productName?.trim() && catalog?.length) {
    const match = batches.find((b) => productsMatch(b.productName ?? "", productName, catalog));
    if (match) {
      return {
        batchNo: match.batchNo,
        productName: match.productName?.trim() ?? "",
        totalLiters: match.totalLiters,
        closedAt: match.closedAt,
      };
    }
  }

  return {
    batchNo: batches[0]!.batchNo,
    productName: batches[0]!.productName?.trim() ?? "",
    totalLiters: batches[0]!.totalLiters,
    closedAt: batches[0]!.closedAt,
  };
}

export async function previousBottlesForReadyLot(args: {
  batchNo: string;
  productCode: string;
  bundleSetId?: string;
}): Promise<number> {
  const code = args.productCode.trim().toLowerCase();
  const setId = args.bundleSetId?.trim() ?? "";
  const existing = await ReadyBottleBatchLot.findOne({
    batchNo: args.batchNo,
    productCode: code,
    bundleSetId: setId,
  })
    .select({ bottles: 1 })
    .lean();
  return existing?.bottles ?? 0;
}

/** Reject increases that would exceed Esha's remaining liters for a QC-linked lot. */
export async function validateNimraLinkedReadyLotChange(args: {
  nimraBatch: NimraBatchRef;
  productName: string;
  previousBottles: number;
  newBottles: number;
  catalog: PackingCatalogRow[];
  usedMap: Map<string, number>;
  usageCatalog: CatalogProduct[];
}): Promise<string | null> {
  if (isBatchClosed(args.nimraBatch)) {
    return `Batch "${args.nimraBatch.batchNo}" is closed in QC. Use a different batch label for legacy ready stock.`;
  }

  const deltaBottles = args.newBottles - args.previousBottles;
  if (deltaBottles <= 0) return null;

  const deltaLiters = litersForReadyBottles(deltaBottles, args.productName, args.catalog);
  const usage = usageForBatchNo(
    args.nimraBatch.batchNo,
    args.nimraBatch.totalLiters,
    args.usedMap,
    args.nimraBatch.productName,
    args.usageCatalog,
  );

  if (deltaLiters > usage.remainingLiters + 1e-9) {
    return `Not enough liquid in QC batch "${args.nimraBatch.batchNo}": need ${formatLiters(deltaLiters)} L for ${deltaBottles} more bottle(s), only ${formatLiters(usage.remainingLiters)} L remaining in Esha's pool.`;
  }

  return null;
}

export async function loadReadyLotValidationContext(): Promise<{
  catalog: PackingCatalogRow[];
  usedMap: Map<string, number>;
  usageCatalog: CatalogProduct[];
}> {
  const { catalog, usedMap } = await loadBatchUsageContext();
  const usageCatalog: CatalogProduct[] = catalog.map((p) => ({
    name: p.name,
    litersPerBottle: p.litersPerBottle,
    aliases: p.aliases,
    batchFamily: p.batchFamily,
  }));
  return { catalog, usedMap, usageCatalog };
}

export function nimraConsumptionMessage(args: {
  nimraBatch: NimraBatchRef;
  productName: string;
  previousBottles: number;
  newBottles: number;
  catalog: PackingCatalogRow[];
}): string | null {
  const deltaBottles = args.newBottles - args.previousBottles;
  if (deltaBottles <= 0) return null;
  const deltaLiters = litersForReadyBottles(deltaBottles, args.productName, args.catalog);
  return `${formatLiters(deltaLiters)} L deducted from Esha's batch ${args.nimraBatch.batchNo}.`;
}

export function batchUsageKeyForNimraBatch(
  nimraBatch: NimraBatchRef,
  catalog: CatalogProduct[],
): string {
  return batchUsageKey(nimraBatch.batchNo, nimraBatch.productName, catalog);
}
