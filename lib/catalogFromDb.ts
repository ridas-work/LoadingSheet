import { inferLitersPerBottleFromName, type CatalogProduct } from "@/lib/batchVolume";
import { batchProductMatchKey, looseProductKey } from "@/lib/batchProductMatch";
import type { PackingCatalogRow } from "@/lib/bundleCatalog";
import { CUSTOM_BOTTLE_SIZE_OPTIONS } from "@/lib/customBottleSizes";

type CatalogDoc = {
  code: string;
  name: string;
  bottlesPerCarton?: number | null;
  litersPerBottle?: number | null;
  aliases?: string[];
  batchFamily?: string | null;
  bundleComponents?: Array<{ code: string; bottlesPerUnit: number }>;
};

export function packingCatalogFromDocs(docs: CatalogDoc[]): PackingCatalogRow[] {
  const byCode = new Map(docs.map((p) => [p.code.trim().toLowerCase(), p]));

  return docs.map((p) => {
    const row: PackingCatalogRow = {
      code: p.code,
      name: p.name,
      bottlesPerCarton: typeof p.bottlesPerCarton === "number" && p.bottlesPerCarton > 0 ? p.bottlesPerCarton : 1,
      litersPerBottle: inferLitersPerBottleFromName(p.name, p.litersPerBottle),
      aliases: p.aliases ?? [],
      batchFamily: p.batchFamily?.trim() || p.name,
    };

    if (p.bundleComponents?.length) {
      row.bundleComponents = p.bundleComponents.map((c) => {
        const part = byCode.get(c.code.trim().toLowerCase());
        return {
          code: c.code,
          bottlesPerUnit: c.bottlesPerUnit,
        };
      });
    }

    return row;
  });
}

export function catalogProductsOnly(catalog: PackingCatalogRow[]): CatalogProduct[] {
  return catalog.map((p) => ({
    name: p.name,
    litersPerBottle: p.litersPerBottle,
    aliases: p.aliases,
    batchFamily: p.batchFamily,
  }));
}

export type FillingPackingOption = {
  code: string;
  name: string;
  litersPerBottle: number;
  batchFamily: string;
};

const FILLING_SIZE_CODE_PREFIX = "size:";

/** Synthetic filling rows (drums, cans, ml sizes) — no bottle/cap UIP deduction. */
export function isFillingContainerSizeCode(productCode: string): boolean {
  return productCode.trim().toLowerCase().startsWith(FILLING_SIZE_CODE_PREFIX);
}

const RHINO_BATCH_KEY = looseProductKey("RHINO 5LTR");

const RHINO_FILLING_SIZE_CODES = ["250ml", "500ml", "750ml", "5l-jar"] as const;

const GENERAL_FILLING_SIZE_CODES = [
  "5l-jar",
  "1l",
  "500ml",
  "750ml",
  "250ml",
  "100ml",
  "25l-can",
  "120l-drum",
  "150l-drum",
  "200l-drum",
] as const;

function normalizedCatalogKeys(packing: PackingCatalogRow): string[] {
  return [
    packing.name,
    packing.batchFamily ?? "",
    ...(packing.aliases ?? []),
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function batchMatchesPacking(batchProductName: string, packing: PackingCatalogRow): boolean {
  const batchKey = batchProductMatchKey(batchProductName);
  if (!batchKey) return false;
  for (const catalogKey of normalizedCatalogKeys(packing)) {
    if (batchProductMatchKey(catalogKey) === batchKey) return true;
    if (looseProductKey(catalogKey) === batchKey) return true;
  }
  return false;
}

function isRhinoBatch(batchProductName: string): boolean {
  return batchProductMatchKey(batchProductName) === RHINO_BATCH_KEY;
}

function fillingSizeCodesForBatch(batchProductName: string): readonly string[] {
  return isRhinoBatch(batchProductName) ? RHINO_FILLING_SIZE_CODES : GENERAL_FILLING_SIZE_CODES;
}

function litersAlreadyCovered(liters: number, existing: FillingPackingOption[]): boolean {
  return existing.some((option) => Math.abs(option.litersPerBottle - liters) < 0.0005);
}

function syntheticSizeOption(
  batchProductName: string,
  sizeCode: string,
  batchFamily: string,
): FillingPackingOption | null {
  const size = CUSTOM_BOTTLE_SIZE_OPTIONS.find((o) => o.code === sizeCode);
  if (!size || size.code === "catalog" || !("litersPerBottle" in size)) return null;
  const base = batchProductName.trim();
  return {
    code: `${FILLING_SIZE_CODE_PREFIX}${size.code}`,
    name: `${base} — ${size.label}`,
    litersPerBottle: size.litersPerBottle,
    batchFamily: batchFamily || base,
  };
}

function primaryBatchFamily(batchProductName: string, catalogMatches: FillingPackingOption[]): string {
  if (catalogMatches.length > 0) {
    return catalogMatches[0]!.batchFamily;
  }
  return batchProductName.trim();
}

export function packingOptionsForBatchProduct(
  batchProductName: string,
  catalog: PackingCatalogRow[],
): FillingPackingOption[] {
  const key = batchProductName.trim().toLowerCase();
  if (!key) return [];

  const byCode = new Map(catalog.map((p) => [p.code.trim().toLowerCase(), p]));
  const matched = new Map<string, FillingPackingOption>();

  for (const packing of catalog) {
    let include = batchMatchesPacking(batchProductName, packing);

    if (!include && packing.bundleComponents?.length) {
      const batchKey = batchProductMatchKey(batchProductName);
      const componentFamilies = packing.bundleComponents
        .map((ref) => byCode.get(ref.code.trim().toLowerCase()))
        .filter(Boolean)
        .flatMap((part) => normalizedCatalogKeys(part!));
      include = componentFamilies.some(
        (cf) => batchProductMatchKey(cf) === batchKey || looseProductKey(cf) === batchKey,
      );
    }

    if (!include) continue;

    matched.set(packing.code, {
      code: packing.code,
      name: packing.name,
      litersPerBottle: packing.litersPerBottle,
      batchFamily: packing.batchFamily?.trim() || packing.name,
    });

    if (packing.bundleComponents?.length) {
      for (const ref of packing.bundleComponents) {
        const part = byCode.get(ref.code.trim().toLowerCase());
        if (!part || !batchMatchesPacking(batchProductName, part)) continue;
        matched.set(part.code, {
          code: part.code,
          name: part.name,
          litersPerBottle: part.litersPerBottle,
          batchFamily: part.batchFamily?.trim() || part.name,
        });
      }
    }
  }

  const catalogMatches = [...matched.values()];
  const batchFamily = primaryBatchFamily(batchProductName, catalogMatches);
  const sizeCodes = fillingSizeCodesForBatch(batchProductName);

  for (const sizeCode of sizeCodes) {
    const synthetic = syntheticSizeOption(batchProductName, sizeCode, batchFamily);
    if (!synthetic) continue;
    if (litersAlreadyCovered(synthetic.litersPerBottle, catalogMatches)) continue;
    if (litersAlreadyCovered(synthetic.litersPerBottle, [...matched.values()])) continue;
    matched.set(synthetic.code, synthetic);
  }

  return [...matched.values()].sort((a, b) => {
    if (a.litersPerBottle !== b.litersPerBottle) return a.litersPerBottle - b.litersPerBottle;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}
