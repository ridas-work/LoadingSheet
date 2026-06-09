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

/** Extra products shown only in the custom-carton product dropdown (not the main PO grid). */
export const CUSTOM_CARTON_ONLY_PRODUCTS: CustomCartonCatalogProduct[] = (
  customCartonProductNames as string[]
).map((name) => ({
  code: slugFromCustomCartonName(name),
  name: name.trim(),
}));

/** Main catalog + custom-carton-only extras (deduped by code and name). */
export function catalogForCustomCartonBuilder(
  mainCatalog: CustomCartonCatalogProduct[],
): CustomCartonCatalogProduct[] {
  const codes = new Set(mainCatalog.map((p) => p.code));
  const names = new Set(mainCatalog.map((p) => p.name.trim().toLowerCase()));
  const extras = CUSTOM_CARTON_ONLY_PRODUCTS.filter(
    (p) => !codes.has(p.code) && !names.has(p.name.trim().toLowerCase()),
  );
  return [...mainCatalog, ...extras];
}
