import { inferLitersPerBottleFromName, type CatalogProduct } from "@/lib/batchVolume";
import type { PackingCatalogRow } from "@/lib/bundleCatalog";

type CatalogDoc = {
  code: string;
  name: string;
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
