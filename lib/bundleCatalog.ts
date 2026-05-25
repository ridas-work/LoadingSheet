import {
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  productsMatch,
  roundLiters,
  type CatalogProduct,
} from "@/lib/batchVolume";
import { isMixedSampleLine, resolveMixedSampleParts } from "@/lib/mixedSampleBox";

export type BundleComponentRef = {
  code: string;
  bottlesPerUnit: number;
};

export type PackingCatalogRow = CatalogProduct & {
  code: string;
  bottlesPerCarton: number;
  bundleComponents?: BundleComponentRef[];
};

export type ComponentBatch = {
  productName: string;
  batchNo?: string | null;
};

export type SheetLineLike = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  lineKind?: string | null;
  mixedContents?: Array<{ productName: string; bottles: number }> | null;
  batchNo?: string | null;
  componentBatches?: ComponentBatch[] | null;
  weight?: number | null;
};

function lineUsesComponentBatches(
  line: SheetLineLike,
  catalog: PackingCatalogRow[],
): boolean {
  return isMixedSampleLine(line) || isBundleProduct(line.productName, catalog);
}

function resolveComponentParts(
  line: SheetLineLike,
  catalog: PackingCatalogRow[],
): Array<{ productName: string; bottlesPerUnit: number; litersPerBottle: number }> {
  if (isMixedSampleLine(line)) {
    return resolveMixedSampleParts(line, catalog);
  }
  return resolveBundleParts(line.productName, catalog);
}

export type BatchLiterAllocation = {
  batchNo: string;
  liters: number;
  productName: string;
};

export function catalogByName(catalog: PackingCatalogRow[]): Map<string, PackingCatalogRow> {
  const map = new Map<string, PackingCatalogRow>();
  for (const p of catalog) {
    map.set(p.name.trim().toLowerCase(), p);
    for (const alias of p.aliases ?? []) {
      map.set(alias.trim().toLowerCase(), p);
    }
  }
  return map;
}

export function findPackingByName(productName: string, catalog: PackingCatalogRow[]): PackingCatalogRow | null {
  const key = productName.trim().toLowerCase();
  if (!key) return null;
  return catalogByName(catalog).get(key) ?? null;
}

export function isBundleProduct(productName: string, catalog: PackingCatalogRow[]): boolean {
  const packing = findPackingByName(productName, catalog);
  return Boolean(packing?.bundleComponents && packing.bundleComponents.length > 0);
}

export function resolveBundleParts(
  productName: string,
  catalog: PackingCatalogRow[],
): Array<{ productName: string; bottlesPerUnit: number; litersPerBottle: number }> {
  const packing = findPackingByName(productName, catalog);
  if (!packing?.bundleComponents?.length) return [];

  const byCode = new Map(catalog.map((p) => [p.code.trim().toLowerCase(), p]));
  const parts: Array<{ productName: string; bottlesPerUnit: number; litersPerBottle: number }> = [];

  for (const ref of packing.bundleComponents) {
    const part = byCode.get(ref.code.trim().toLowerCase());
    if (!part) continue;
    parts.push({
      productName: part.name,
      bottlesPerUnit: ref.bottlesPerUnit,
      litersPerBottle: inferLitersPerBottleFromName(part.name, part.litersPerBottle),
    });
  }

  return parts;
}

export function formatBatchDisplay(line: SheetLineLike, catalog: PackingCatalogRow[]): string {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = resolveComponentParts(line, catalog);
    const labels = parts.map((part) => {
      const hit =
        line.componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
        line.componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
      return normalizeBatchNo(hit?.batchNo ?? "");
    });
    return labels.filter(Boolean).join(" / ");
  }
  return normalizeBatchNo(line.batchNo ?? "");
}

export function lineBatchComplete(line: SheetLineLike, catalog: PackingCatalogRow[]): boolean {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = resolveComponentParts(line, catalog);
    if (parts.length === 0) return false;
    return parts.every((part) => {
      const hit =
        line.componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
        line.componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
      return Boolean(hit?.batchNo?.trim());
    });
  }
  return Boolean(line.batchNo?.trim());
}

export function lineBatchAllocations(
  line: SheetLineLike,
  catalog: PackingCatalogRow[],
): BatchLiterAllocation[] {
  if (lineUsesComponentBatches(line, catalog)) {
    const parts = resolveComponentParts(line, catalog);
    const allocations: BatchLiterAllocation[] = [];

    for (const part of parts) {
      const hit =
        line.componentBatches?.find((c) => c.productName.trim() === part.productName.trim()) ??
        line.componentBatches?.find((c) => productsMatch(c.productName, part.productName, catalog));
      const batchNo = normalizeBatchNo(hit?.batchNo ?? "");
      if (!batchNo) continue;
      const liters = isMixedSampleLine(line)
        ? roundLiters(part.bottlesPerUnit * part.litersPerBottle)
        : roundLiters(line.bottlesPerBox * part.bottlesPerUnit * part.litersPerBottle);
      allocations.push({ batchNo, liters, productName: part.productName });
    }

    return allocations;
  }

  const batchNo = normalizeBatchNo(line.batchNo ?? "");
  if (!batchNo) return [];

  const packing = findPackingByName(line.productName, catalog);
  const lp = packing
    ? inferLitersPerBottleFromName(packing.name, packing.litersPerBottle)
    : inferLitersPerBottleFromName(line.productName);
  return [
    {
      batchNo,
      liters: roundLiters(line.bottlesPerBox * lp),
      productName: line.productName,
    },
  ];
}

export function lineTotalLiters(line: SheetLineLike, catalog: PackingCatalogRow[]): number | null {
  const allocations = lineBatchAllocations(line, catalog);
  if (allocations.length === 0) return null;
  return roundLiters(allocations.reduce((sum, a) => sum + a.liters, 0));
}

export type ValidateAllocationsResult =
  | { ok: true; weights: Map<number, number | null> }
  | {
      ok: false;
      error: string;
      details?: { batchNo: string; usedLiters: number; totalLiters: number };
    };

export function validateSheetBatchAllocations(
  lines: SheetLineLike[],
  batchDefs: Array<{ batchNo: string; totalLiters: number }>,
  catalog: PackingCatalogRow[],
): ValidateAllocationsResult {
  const weights = new Map<number, number | null>();
  const defByBatch = new Map(
    batchDefs.map((d) => [normalizeBatchNo(d.batchNo).toLowerCase(), d.totalLiters]),
  );
  const usedByBatch = new Map<string, number>();
  const displayBatchNo = new Map<string, string>();

  for (const line of lines) {
    const allocations = lineBatchAllocations(line, catalog);
    if (allocations.length === 0) {
      weights.set(line.boxNo, null);
      continue;
    }

    weights.set(line.boxNo, roundLiters(allocations.reduce((sum, a) => sum + a.liters, 0)));

    for (const alloc of allocations) {
      const key = alloc.batchNo.toLowerCase();
      displayBatchNo.set(key, alloc.batchNo);

      if (!defByBatch.has(key)) {
        return { ok: false, error: `Enter total liters for batch "${alloc.batchNo}".` };
      }

      usedByBatch.set(key, roundLiters((usedByBatch.get(key) ?? 0) + alloc.liters));
    }
  }

  for (const [key, usedLiters] of usedByBatch) {
    const totalLiters = defByBatch.get(key) ?? 0;
    if (usedLiters > totalLiters + 1e-9) {
      return {
        ok: false,
        error: `Batch "${displayBatchNo.get(key) ?? key}" over-allocated: ${usedLiters} L used, batch is ${totalLiters} L.`,
        details: { batchNo: displayBatchNo.get(key) ?? key, usedLiters, totalLiters },
      };
    }
  }

  return { ok: true, weights };
}

export function accumulateBatchUsageFromSheetLines(
  orders: Array<{ sheetLines?: SheetLineLike[] }>,
  catalog: PackingCatalogRow[],
  excludeOrderId?: string,
): Map<string, number> {
  const used = new Map<string, number>();

  for (const order of orders) {
    const oid = (order as { _id?: { toString(): string } | string })._id;
    const orderId = typeof oid === "string" ? oid : oid?.toString();
    if (excludeOrderId && orderId === excludeOrderId) continue;

    for (const line of order.sheetLines ?? []) {
      for (const alloc of lineBatchAllocations(line, catalog)) {
        const key = alloc.batchNo.toLowerCase();
        used.set(key, roundLiters((used.get(key) ?? 0) + alloc.liters));
      }
    }
  }

  return used;
}

export function usageLitersByBatchFromSheetLines(
  lines: SheetLineLike[],
  catalog: PackingCatalogRow[],
): Map<string, number> {
  const used = new Map<string, number>();
  for (const line of lines) {
    for (const alloc of lineBatchAllocations(line, catalog)) {
      const key = alloc.batchNo.toLowerCase();
      used.set(key, roundLiters((used.get(key) ?? 0) + alloc.liters));
    }
  }
  return used;
}
