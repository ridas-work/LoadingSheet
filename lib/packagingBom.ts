import productBomData from "@/data/product-packaging-bom.json";

export type BomLine = {
  packagingItemCode: string;
  qtyPerBottle?: number;
  qtyPerCarton?: number;
  role?: string;
};

export type BomEntry = {
  productCode: string;
  lines?: BomLine[];
  includes?: Array<{ productCode: string; bottlesPerUnit?: number }>;
};

const BOM = productBomData as BomEntry[];

function key(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function loadProductBom(): BomEntry[] {
  return BOM;
}

export function findBomEntry(productCode: string): BomEntry | null {
  const code = key(productCode);
  return BOM.find((b) => key(b.productCode) === code) ?? null;
}

/** Expand BOM into packaging SKU quantities for a given bottle + carton count. */
export function expandBomRequirements(
  productCode: string,
  bottles: number,
  cartons: number,
): Map<string, number> {
  const out = new Map<string, number>();
  accumulateBom(productCode, Math.max(0, bottles), Math.max(0, cartons), out, new Set());
  return out;
}

function addQty(map: Map<string, number>, code: string, qty: number) {
  const c = key(code);
  if (!c || qty <= 0) return;
  map.set(c, (map.get(c) ?? 0) + qty);
}

function accumulateBom(
  productCode: string,
  bottles: number,
  cartons: number,
  out: Map<string, number>,
  visiting: Set<string>,
) {
  const code = key(productCode);
  if (!code) return;
  if (visiting.has(code)) return;
  visiting.add(code);

  const entry = findBomEntry(code);
  if (!entry) {
    visiting.delete(code);
    return;
  }

  for (const line of entry.lines ?? []) {
    const itemCode = key(line.packagingItemCode);
    if (!itemCode) continue;
    if (typeof line.qtyPerBottle === "number" && line.qtyPerBottle > 0 && bottles > 0) {
      addQty(out, itemCode, line.qtyPerBottle * bottles);
    }
    if (typeof line.qtyPerCarton === "number" && line.qtyPerCarton > 0 && cartons > 0) {
      addQty(out, itemCode, line.qtyPerCarton * cartons);
    }
  }

  for (const inc of entry.includes ?? []) {
    const perUnit = Math.max(1, Math.floor(inc.bottlesPerUnit ?? 1));
    // Nested component packaging is per included bottle; carton packaging stays on the parent BOM lines.
    accumulateBom(inc.productCode, bottles * perUnit, 0, out, visiting);
  }

  visiting.delete(code);
}

export function expandBomPackagingCodes(productCode: string): string[] {
  const entry = findBomEntry(productCode);
  if (!entry) return [];
  const codes = new Set<string>();
  for (const line of entry.lines ?? []) {
    codes.add(key(line.packagingItemCode));
  }
  for (const inc of entry.includes ?? []) {
    for (const nested of expandBomPackagingCodes(inc.productCode)) {
      codes.add(nested);
    }
  }
  return [...codes].filter(Boolean);
}
