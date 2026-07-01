import type { CustomCartonCatalogProduct } from "@/components/CustomCartonBuilder";

import customCartonProductNames from "@/data/custom-carton-products.json";

function slugFromCustomCartonName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `cc-${slug}`;
}

/** Built-in extras from JSON (also seeded to DB). Used as fallback when API is unavailable. */
export const CUSTOM_CARTON_ONLY_PRODUCTS: CustomCartonCatalogProduct[] = (
  customCartonProductNames as string[]
).map((name) => ({
  code: slugFromCustomCartonName(name),
  name: name.trim(),
}));

function dedupeExtras(items: CustomCartonCatalogProduct[]): CustomCartonCatalogProduct[] {
  const byCode = new Map<string, CustomCartonCatalogProduct>();
  for (const p of items) {
    const code = p.code.trim().toLowerCase();
    const name = p.name.trim();
    if (!code || !name) continue;
    if (!byCode.has(code)) byCode.set(code, { code, name });
  }
  return [...byCode.values()];
}

/** Main catalog + custom-carton-only extras (deduped by code and name). */
export function catalogForCustomCartonBuilder(
  mainCatalog: CustomCartonCatalogProduct[],
  savedExtras: CustomCartonCatalogProduct[] = [],
): CustomCartonCatalogProduct[] {
  const codes = new Set(mainCatalog.map((p) => p.code.trim().toLowerCase()));
  const names = new Set(mainCatalog.map((p) => p.name.trim().toLowerCase()));
  const extras = dedupeExtras([...savedExtras, ...CUSTOM_CARTON_ONLY_PRODUCTS]).filter(
    (p) => !codes.has(p.code) && !names.has(p.name.trim().toLowerCase()),
  );
  return [...mainCatalog, ...extras];
}
