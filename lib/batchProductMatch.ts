import { productBaseName, stripCustomContainerSuffixes } from "@/lib/customBottleSizes";

import batchProductAliases from "@/data/batch-product-aliases.json";

/** Loose key: lowercase letters and digits only — ignores spaces, hyphens, punctuation. */
export function looseProductKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Strip container sizes and display noise so PO lines match Nimra batch names.
 * e.g. "GO-1 200 litre drum" and "GO 1" → same key.
 * e.g. "HAND WASH jar 5 litre jar" and "HAND WASH" → same key.
 */
export function batchProductMatchKey(raw: string): string {
  let name = raw.trim();
  if (!name) return "";

  name = stripCustomContainerSuffixes(name);
  name = productBaseName(name);
  name = name.replace(/\([^)]*\)/g, " ");
  name = name.replace(/\s+/g, " ").trim();

  const loose = looseProductKey(name);
  if (!loose) return "";

  const aliasMap = buildAliasMap();
  return aliasMap.get(loose) ?? loose;
}

function buildAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of batchProductAliases as Array<{ canonical: string; aliases: string[] }>) {
    const canonicalLoose = looseProductKey(entry.canonical);
    if (!canonicalLoose) continue;
    map.set(canonicalLoose, canonicalLoose);
    for (const alias of entry.aliases) {
      const aliasLoose = looseProductKey(alias);
      if (aliasLoose) map.set(aliasLoose, canonicalLoose);
    }
  }
  return map;
}
