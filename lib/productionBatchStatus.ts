import {
  accumulateBatchUsageFromOrders,
  formatLiters,
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  roundLiters,
  type CatalogProduct,
} from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";

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

export async function loadCatalogForBatchUsage(): Promise<CatalogProduct[]> {
  await connectToDatabase();
  const catalogDocs = await ProductPacking.find({ active: true })
    .select({ name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1 })
    .lean();
  return catalogDocs.map((p) => ({
    name: p.name,
    litersPerBottle: inferLitersPerBottleFromName(p.name, p.litersPerBottle),
    aliases: p.aliases ?? [],
    batchFamily: p.batchFamily?.trim() || p.name,
  }));
}

export async function loadBatchUsageMap(catalog: CatalogProduct[]) {
  await connectToDatabase();
  const orders = await Order.find({}).select({ sheetLines: 1 }).lean();
  return accumulateBatchUsageFromOrders(orders, catalog);
}

export function usageForBatchNo(
  batchNo: string,
  totalLiters: number,
  usedMap: Map<string, number>,
) {
  const key = normalizeBatchNo(batchNo).toLowerCase();
  const usedLiters = usedMap.get(key) ?? 0;
  const remainingLiters = roundLiters(Math.max(0, totalLiters - usedLiters));
  const status = productionBatchStatus(totalLiters, usedLiters);
  return {
    usedLiters,
    remainingLiters,
    status,
    locked: isProductionBatchLocked(usedLiters),
  };
}

export async function loadBatchUsageContext() {
  const catalog = await loadCatalogForBatchUsage();
  const usedMap = await loadBatchUsageMap(catalog);
  return { catalog, usedMap };
}
