import { inferLitersPerBottleFromName, type CatalogProduct } from "@/lib/batchVolume";
import type { PackingCatalogRow } from "@/lib/bundleCatalog";

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

function normalizedCatalogKeys(packing: PackingCatalogRow): string[] {
  return [
    packing.name,
    packing.batchFamily ?? "",
    ...(packing.aliases ?? []),
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function packingOptionsForBatchProduct(
  batchProductName: string,
  catalog: PackingCatalogRow[],
): FillingPackingOption[] {
  const key = batchProductName.trim().toLowerCase();
  if (!key) return [];

  return catalog
    .filter((packing) => normalizedCatalogKeys(packing).includes(key))
    .map((packing) => ({
      code: packing.code,
      name: packing.name,
      litersPerBottle: packing.litersPerBottle,
      batchFamily: packing.batchFamily?.trim() || packing.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
