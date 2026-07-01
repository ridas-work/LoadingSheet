import mongoose from "mongoose";

import {
  inferLitersPerBottleFromName,
  productsMatch,
  roundLiters,
} from "@/lib/batchVolume";
import { findPackingByName, type PackingCatalogRow } from "@/lib/bundleCatalog";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { SampleProductionMovement } from "@/lib/models/SampleProductionMovement";
import { mergeOpenBatchFilter } from "@/lib/productionBatchClose";

export type ProductionPurpose = "regular" | "sample";

export type SampleProductLine = {
  productName: string;
  bottles?: number;
  notes?: string;
};

export type SamplePoolLine = {
  productName: string;
  availableLiters: number;
  availableBottlesEstimate: number;
};

/** Batches used on customer PO loading sheets — excludes sample-only pool and closed batches. */
export function regularProductionBatchMongoFilter(): Record<string, unknown> {
  return mergeOpenBatchFilter({ productionPurpose: { $ne: "sample" } });
}

export function sampleProductionBatchMongoFilter(): Record<string, unknown> {
  return mergeOpenBatchFilter({
    productionPurpose: "sample",
    qcOutcome: { $in: ["approved", null, ""] },
  });
}

export function parseProductionPurpose(v: unknown): ProductionPurpose {
  return v === "sample" ? "sample" : "regular";
}

function litersPerBottleForProduct(productName: string, catalog: PackingCatalogRow[]): number {
  const packing = findPackingByName(productName, catalog);
  return inferLitersPerBottleFromName(packing?.name ?? productName, packing?.litersPerBottle);
}

function batchMatchesProduct(
  batchProductName: string,
  lineProductName: string,
  catalog: PackingCatalogRow[],
): boolean {
  return productsMatch(batchProductName, lineProductName, catalog);
}

async function drawnLitersByBatchId(batchIds: mongoose.Types.ObjectId[]): Promise<Map<string, number>> {
  if (batchIds.length === 0) return new Map();
  const movements = await SampleProductionMovement.find({
    productionBatchId: { $in: batchIds },
  })
    .select({ productionBatchId: 1, liters: 1 })
    .lean();

  const map = new Map<string, number>();
  for (const m of movements) {
    const id = m.productionBatchId.toString();
    map.set(id, roundLiters((map.get(id) ?? 0) + m.liters));
  }
  return map;
}

export async function remainingSampleLitersForBatch(
  batch: { _id: mongoose.Types.ObjectId; totalLiters: number },
  drawnMap?: Map<string, number>,
): Promise<number> {
  const drawn =
    drawnMap?.get(batch._id.toString()) ??
    (
      await SampleProductionMovement.aggregate<{ total: number }>([
        { $match: { productionBatchId: batch._id } },
        { $group: { _id: null, total: { $sum: "$liters" } } },
      ])
    )[0]?.total ??
    0;
  return roundLiters(Math.max(0, batch.totalLiters - drawn));
}

export async function samplePoolForCatalog(catalog: PackingCatalogRow[]): Promise<SamplePoolLine[]> {
  await connectToDatabase();
  const batches = await ProductionBatch.find(sampleProductionBatchMongoFilter())
    .sort({ preparedAt: 1, createdAt: 1 })
    .lean();

  const drawnMap = await drawnLitersByBatchId(batches.map((b) => b._id));

  const litersByProduct = new Map<string, number>();
  for (const batch of batches) {
    const remaining = await remainingSampleLitersForBatch(
      { _id: batch._id, totalLiters: batch.totalLiters },
      drawnMap,
    );
    if (remaining <= 0) continue;
    const key = batch.productName.trim();
    litersByProduct.set(key, roundLiters((litersByProduct.get(key) ?? 0) + remaining));
  }

  const lines: SamplePoolLine[] = [];
  for (const [productName, availableLiters] of litersByProduct) {
    const lp = litersPerBottleForProduct(productName, catalog);
    lines.push({
      productName,
      availableLiters,
      availableBottlesEstimate: lp > 0 ? Math.floor(availableLiters / lp) : 0,
    });
  }
  return lines.sort((a, b) => a.productName.localeCompare(b.productName));
}

export function availableLitersForProductName(
  productName: string,
  pool: SamplePoolLine[],
  catalog: PackingCatalogRow[],
): number {
  const trimmed = productName.trim();
  if (!trimmed) return 0;

  let total = 0;
  for (const line of pool) {
    if (productsMatch(line.productName, trimmed, catalog)) {
      total += line.availableLiters;
    }
  }
  return roundLiters(total);
}

export function insufficientSampleStockMessage(
  products: SampleProductLine[],
  catalog: PackingCatalogRow[],
  pool: SamplePoolLine[],
): string | null {
  const shortages: string[] = [];
  for (const p of products) {
    const name = p.productName.trim();
    if (!name) continue;
    const bottles = typeof p.bottles === "number" && p.bottles >= 1 ? p.bottles : 1;
    const need = roundLiters(bottles * litersPerBottleForProduct(name, catalog));
    const have = availableLitersForProductName(name, pool, catalog);
    if (have + 0.0001 < need) {
      shortages.push(`${name} — need ${need} L, only ${have} L in sample pool`);
    }
  }
  if (shortages.length === 0) return null;
  return `Not enough sample production stock:\n${shortages.join("\n")}`;
}

export type DeductSampleActor = {
  userName: string;
  username?: string;
};

export async function deductSampleProduction(input: {
  products: SampleProductLine[];
  visitTicketId: string;
  actor: DeductSampleActor;
  catalog: PackingCatalogRow[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mongoose.Types.ObjectId.isValid(input.visitTicketId)) {
    return { ok: false, error: "Invalid visit ticket id" };
  }

  await connectToDatabase();

  const pool = await samplePoolForCatalog(input.catalog);
  const shortage = insufficientSampleStockMessage(input.products, input.catalog, pool);
  if (shortage) {
    return { ok: false, error: shortage };
  }

  const visitOid = new mongoose.Types.ObjectId(input.visitTicketId);
  const batches = await ProductionBatch.find(sampleProductionBatchMongoFilter())
    .sort({ preparedAt: 1, createdAt: 1 })
    .lean();

  const drawnMap = await drawnLitersByBatchId(batches.map((b) => b._id));

  for (const line of input.products) {
    const productName = line.productName.trim();
    if (!productName) continue;
    const bottles = typeof line.bottles === "number" && line.bottles >= 1 ? line.bottles : 1;
    let litersLeft = roundLiters(bottles * litersPerBottleForProduct(productName, input.catalog));

    for (const batch of batches) {
      if (litersLeft <= 0) break;
      if (!batchMatchesProduct(batch.productName, productName, input.catalog)) continue;

      const remaining = await remainingSampleLitersForBatch(
        { _id: batch._id, totalLiters: batch.totalLiters },
        drawnMap,
      );
      if (remaining <= 0) continue;

      const take = roundLiters(Math.min(remaining, litersLeft));
      const lp = litersPerBottleForProduct(productName, input.catalog);
      const bottlesTaken = lp > 0 ? Math.max(1, Math.round(take / lp)) : 1;

      await SampleProductionMovement.create({
        visitTicketId: visitOid,
        productionBatchId: batch._id,
        batchNo: batch.batchNo,
        productName,
        bottles: bottlesTaken,
        liters: take,
        recordedAt: new Date(),
        recordedByName: input.actor.userName,
        repUsername: input.actor.username?.trim().toLowerCase() ?? "",
      });

      drawnMap.set(batch._id.toString(), roundLiters((drawnMap.get(batch._id.toString()) ?? 0) + take));
      litersLeft = roundLiters(litersLeft - take);
    }

    if (litersLeft > 0.0001) {
      return {
        ok: false,
        error: `Could not allocate enough sample stock for ${productName}.`,
      };
    }
  }

  return { ok: true };
}
