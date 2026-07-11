import { batchProductMatchKey } from "@/lib/batchProductMatch";
import { findPackingForLineName } from "@/lib/productPackingMatch";

export type CatalogProduct = {
  name: string;
  litersPerBottle: number;
  aliases?: string[];
  batchFamily?: string;
};

export type BatchDef = {
  batchNo: string;
  totalLiters: number;
  productName?: string;
};

export type BatchPoolRef = {
  batchNo: string;
  productName: string;
};

export type VolumeSheetLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  batchNo: string;
};

export function normalizeBatchNo(batchNo: string): string {
  return batchNo.trim();
}

export function inferLitersPerBottleFromName(name: string, explicit?: number | null): number {
  if (typeof explicit === "number" && explicit > 0) return explicit;
  const ml = name.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (ml) return Number(ml[1]) / 1000;
  const ltrKgCan = name.match(/(\d+(?:\.\d+)?)\s*ltr\s*\/?\s*kg(?:\/kg)?(?:\s*can)?/i);
  if (ltrKgCan) return Number(ltrKgCan[1]);
  const ltr = name.match(/(\d+(?:\.\d+)?)\s*ltr\b/i);
  if (ltr) return Number(ltr[1]);
  const litre = name.match(/(\d+(?:\.\d+)?)\s*l(?:itre|iter)?s?\b/i);
  if (litre) return Number(litre[1]);
  return 1;
}

export function resolveLitersPerBottle(productName: string, catalog: CatalogProduct[]): number | null {
  const key = productName.trim().toLowerCase();
  if (!key) return null;

  for (const p of catalog) {
    if (p.name.trim().toLowerCase() === key) {
      return inferLitersPerBottleFromName(p.name, p.litersPerBottle);
    }
    for (const alias of p.aliases ?? []) {
      if (alias.trim().toLowerCase() === key) {
        return inferLitersPerBottleFromName(p.name, p.litersPerBottle);
      }
    }
  }

  // Custom / unmatched PO line — infer from product name (e.g. "Rhino 250ml" → 0.25 L).
  const inferred = inferLitersPerBottleFromName(productName);
  if (inferred !== 1 || /\d+\s*ml/i.test(productName) || /\d+\s*l(?:itre|iter)?/i.test(productName)) {
    return inferred;
  }
  return null;
}

export function rowLiters(line: VolumeSheetLine, catalog: CatalogProduct[]): number | null {
  const lp = resolveLitersPerBottle(line.productName, catalog);
  if (lp === null) return null;
  return roundLiters(line.bottlesPerBox * lp);
}

export function roundLiters(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function formatLiters(n: number): string {
  const rounded = roundLiters(n);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
}

export type BatchUsageSummary = {
  batchNo: string;
  usedLiters: number;
  totalLiters: number;
  remainingLiters: number;
};

export function summarizeBatchUsage(
  lines: VolumeSheetLine[],
  batchDefs: BatchDef[],
  catalog: CatalogProduct[],
): { summaries: BatchUsageSummary[]; missingProducts: string[] } {
  const defByBatch = new Map(
    batchDefs.map((d) => [normalizeBatchNo(d.batchNo).toLowerCase(), d.totalLiters]),
  );
  const usedByBatch = new Map<string, number>();
  const missingProducts = new Set<string>();

  for (const line of lines) {
    const batchNo = normalizeBatchNo(line.batchNo);
    if (!batchNo) continue;

    const liters = rowLiters(line, catalog);
    if (liters === null) {
      missingProducts.add(line.productName);
      continue;
    }

    const key = batchNo.toLowerCase();
    usedByBatch.set(key, roundLiters((usedByBatch.get(key) ?? 0) + liters));
  }

  const summaries: BatchUsageSummary[] = [];
  for (const [key, usedLiters] of usedByBatch) {
    const batchNo =
      batchDefs.find((d) => normalizeBatchNo(d.batchNo).toLowerCase() === key)?.batchNo ??
      lines.find((l) => normalizeBatchNo(l.batchNo).toLowerCase() === key)?.batchNo ??
      key;
    const totalLiters = defByBatch.get(key) ?? 0;
    summaries.push({
      batchNo,
      usedLiters,
      totalLiters,
      remainingLiters: roundLiters(totalLiters - usedLiters),
    });
  }

  summaries.sort((a, b) => a.batchNo.localeCompare(b.batchNo));
  return { summaries, missingProducts: [...missingProducts] };
}

export type ValidateResult =
  | { ok: true; weights: Map<number, number | null> }
  | {
      ok: false;
      error: string;
      details?: { batchNo: string; usedLiters: number; totalLiters: number };
      missingProducts?: string[];
    };

export function validateAndComputeWeights(
  lines: VolumeSheetLine[],
  batchDefs: BatchDef[],
  catalog: CatalogProduct[],
): ValidateResult {
  const missingProducts = new Set<string>();
  const weights = new Map<number, number | null>();

  for (const line of lines) {
    const batchNo = normalizeBatchNo(line.batchNo);
    if (!batchNo) {
      weights.set(line.boxNo, null);
      continue;
    }

    const liters = rowLiters(line, catalog);
    if (liters === null) {
      missingProducts.add(line.productName);
      weights.set(line.boxNo, null);
      continue;
    }
    weights.set(line.boxNo, liters);
  }

  if (missingProducts.size > 0) {
    return {
      ok: false,
      error: `No liters-per-bottle in catalog for: ${[...missingProducts].join(", ")}. Update product catalog or PO product name.`,
      missingProducts: [...missingProducts],
    };
  }

  const defByBatch = new Map<string, number>();
  for (const d of batchDefs) {
    const key = normalizeBatchNo(d.batchNo).toLowerCase();
    if (!key) continue;
    if (!Number.isFinite(d.totalLiters) || d.totalLiters <= 0) {
      return {
        ok: false,
        error: `Batch "${d.batchNo}" needs a total size in liters greater than 0.`,
      };
    }
    defByBatch.set(key, d.totalLiters);
  }

  const usedByBatch = new Map<string, number>();
  const displayBatchNo = new Map<string, string>();

  for (const line of lines) {
    const batchNo = normalizeBatchNo(line.batchNo);
    if (!batchNo) continue;

    const key = batchNo.toLowerCase();
    displayBatchNo.set(key, batchNo);

    if (!defByBatch.has(key)) {
      return {
        ok: false,
        error: `Enter total liters for batch "${batchNo}".`,
      };
    }

    const liters = weights.get(line.boxNo);
    if (liters == null) continue;
    usedByBatch.set(key, roundLiters((usedByBatch.get(key) ?? 0) + liters));
  }

  for (const [key, usedLiters] of usedByBatch) {
    const totalLiters = defByBatch.get(key) ?? 0;
    if (usedLiters > totalLiters + 1e-9) {
      return {
        ok: false,
        error: `Batch "${displayBatchNo.get(key) ?? key}" over-allocated: ${formatLiters(usedLiters)} L used, batch is ${formatLiters(totalLiters)} L.`,
        details: {
          batchNo: displayBatchNo.get(key) ?? key,
          usedLiters,
          totalLiters,
        },
      };
    }
  }

  return { ok: true, weights };
}

export type RowBatchIssue = {
  boxNo: number;
  message: string;
  kind: "row_exceeds_batch" | "batch_over_allocated" | "missing_product" | "missing_batch_total";
};

/** Per-row batch problems for live UI (highlights before save). */
export function getRowBatchIssues(
  lines: VolumeSheetLine[],
  batchDefs: BatchDef[],
  catalog: CatalogProduct[],
): RowBatchIssue[] {
  const issues: RowBatchIssue[] = [];
  const defByBatch = new Map(
    batchDefs.map((d) => [normalizeBatchNo(d.batchNo).toLowerCase(), d.totalLiters]),
  );
  const runningUsed = new Map<string, number>();

  for (const line of lines) {
    const batchNo = normalizeBatchNo(line.batchNo);
    if (!batchNo) continue;

    const key = batchNo.toLowerCase();
    const liters = rowLiters(line, catalog);

    if (liters === null) {
      issues.push({
        boxNo: line.boxNo,
        message: `Unknown bottle size for "${line.productName}".`,
        kind: "missing_product",
      });
      continue;
    }

    const totalLiters = defByBatch.get(key);
    if (totalLiters === undefined || !Number.isFinite(totalLiters) || totalLiters <= 0) {
      issues.push({
        boxNo: line.boxNo,
        message: `Enter total liters for batch "${batchNo}".`,
        kind: "missing_batch_total",
      });
      continue;
    }

    if (liters > totalLiters + 1e-9) {
      issues.push({
        boxNo: line.boxNo,
        message: `Box ${line.boxNo} needs ${formatLiters(liters)} L but batch "${batchNo}" is only ${formatLiters(totalLiters)} L.`,
        kind: "row_exceeds_batch",
      });
      continue;
    }

    const nextUsed = roundLiters((runningUsed.get(key) ?? 0) + liters);
    runningUsed.set(key, nextUsed);

    if (nextUsed > totalLiters + 1e-9) {
      issues.push({
        boxNo: line.boxNo,
        message: `Batch "${batchNo}" would exceed ${formatLiters(totalLiters)} L (at ${formatLiters(nextUsed)} L after this row).`,
        kind: "batch_over_allocated",
      });
    }
  }

  return issues;
}

export function validationBlocked(
  lines: VolumeSheetLine[],
  batchDefs: BatchDef[],
  catalog: CatalogProduct[],
): ValidateResult {
  return validateAndComputeWeights(lines, batchDefs, catalog);
}

export type ProductionBatchPoolItem = {
  batchNo: string;
  productName: string;
  totalLiters: number;
};

export type OrderSheetLineInput = {
  batchNo?: string | null;
  productName?: string;
  bottlesPerBox?: number;
};

export function catalogProductKey(productName: string, catalog: CatalogProduct[]): string | null {
  const key = productName.trim().toLowerCase();
  if (!key) return null;

  for (const p of catalog) {
    const family = (p.batchFamily?.trim() || p.name.trim()).toLowerCase();
    if (p.name.trim().toLowerCase() === key) return family;
    for (const alias of p.aliases ?? []) {
      if (alias.trim().toLowerCase() === key) return family;
    }
  }

  for (const p of catalog) {
    const family = (p.batchFamily?.trim() || p.name.trim()).toLowerCase();
    if (family === key) return family;
  }

  const packing = findPackingForLineName(
    productName,
    catalog.map((p) => ({
      code: p.name,
      name: p.name,
      aliases: p.aliases,
      batchFamily: p.batchFamily,
    })),
  );
  if (packing) {
    return (packing.batchFamily?.trim() || packing.name.trim()).toLowerCase();
  }

  return batchProductMatchKey(productName) || key;
}

/** Unique key for batch usage when the same batch no is used for different products. */
export function batchUsageKey(
  batchNo: string,
  productName: string,
  catalog: CatalogProduct[],
): string {
  const bn = normalizeBatchNo(batchNo).toLowerCase();
  if (!bn) return "";
  const pk = catalogProductKey(productName, catalog) ?? productName.trim().toLowerCase();
  return `${bn}::${pk}`;
}

export function productsMatch(a: string, b: string, catalog: CatalogProduct[]): boolean {
  const keyA = catalogProductKey(a, catalog);
  const keyB = catalogProductKey(b, catalog);
  if (keyA !== null && keyB !== null && keyA === keyB) return true;
  const normA = a.trim().toLowerCase().replace(/\s+/g, " ");
  const normB = b.trim().toLowerCase().replace(/\s+/g, " ");
  return normA.length > 0 && normA === normB;
}

export function findPoolBatch(
  pool: ProductionBatchPoolItem[],
  batchNo: string,
  productName: string,
  catalog: CatalogProduct[],
): ProductionBatchPoolItem | undefined {
  const bn = normalizeBatchNo(batchNo).toLowerCase();
  if (!bn) return undefined;
  return pool.find(
    (p) =>
      normalizeBatchNo(p.batchNo).toLowerCase() === bn &&
      productsMatch(p.productName, productName, catalog),
  );
}

export function batchDefKey(def: BatchDef, catalog: CatalogProduct[]): string {
  if (def.productName?.trim()) {
    return batchUsageKey(def.batchNo, def.productName, catalog);
  }
  return normalizeBatchNo(def.batchNo).toLowerCase();
}

export function accumulateBatchUsageFromOrders(
  orders: Array<{ _id?: { toString(): string } | string; sheetLines?: OrderSheetLineInput[] }>,
  catalog: CatalogProduct[],
  excludeOrderId?: string,
): Map<string, number> {
  const used = new Map<string, number>();

  for (const order of orders) {
    const oid = typeof order._id === "string" ? order._id : order._id?.toString();
    if (excludeOrderId && oid === excludeOrderId) continue;

    for (const line of order.sheetLines ?? []) {
      const batchNo = normalizeBatchNo(line.batchNo ?? "");
      if (!batchNo) continue;

      const liters = rowLiters(
        {
          boxNo: 0,
          productName: line.productName ?? "",
          bottlesPerBox: line.bottlesPerBox ?? 0,
          batchNo,
        },
        catalog,
      );
      if (liters === null) continue;

      const key = batchUsageKey(batchNo, line.productName ?? "", catalog);
      used.set(key, roundLiters((used.get(key) ?? 0) + liters));
    }
  }

  return used;
}

export function effectiveBatchDefsForOrder(
  pool: BatchDef[],
  usedElsewhere: Map<string, number>,
  catalog: CatalogProduct[],
): BatchDef[] {
  return pool.map((pb) => {
    const key = batchDefKey(pb, catalog);
    const elsewhere = usedElsewhere.get(key) ?? 0;
    return {
      batchNo: pb.batchNo,
      productName: pb.productName,
      totalLiters: roundLiters(Math.max(0, pb.totalLiters - elsewhere)),
    };
  });
}

export function poolToBatchDefs(pool: ProductionBatchPoolItem[]): BatchDef[] {
  return pool.map((p) => ({
    batchNo: p.batchNo,
    totalLiters: p.totalLiters,
    productName: p.productName,
  }));
}

export function usageLitersByBatchFromLines(
  lines: VolumeSheetLine[],
  catalog: CatalogProduct[],
): Map<string, number> {
  const used = new Map<string, number>();
  for (const line of lines) {
    const batchNo = normalizeBatchNo(line.batchNo);
    if (!batchNo) continue;
    const liters = rowLiters(line, catalog);
    if (liters === null) continue;
    const key = batchUsageKey(batchNo, line.productName, catalog);
    used.set(key, roundLiters((used.get(key) ?? 0) + liters));
  }
  return used;
}
