import { inferLitersPerBottleFromName } from "@/lib/batchVolume";

/** Container sizes PO team can assign per line inside a custom carton. */
export const CUSTOM_BOTTLE_SIZE_OPTIONS = [
  { code: "catalog", label: "As in catalog" },
  { code: "5l-jar", label: "5 litre jar", nameSuffix: "5 litre jar", litersPerBottle: 5 },
  { code: "1l", label: "1 litre", nameSuffix: "1 litre", litersPerBottle: 1 },
  { code: "500ml", label: "500 ml", nameSuffix: "500ml", litersPerBottle: 0.5 },
  { code: "250ml", label: "250 ml", nameSuffix: "250ml", litersPerBottle: 0.25 },
  { code: "100ml", label: "100 ml", nameSuffix: "100ml", litersPerBottle: 0.1 },
] as const;

export type CustomBottleSizeCode = (typeof CUSTOM_BOTTLE_SIZE_OPTIONS)[number]["code"];

const BY_CODE = new Map(CUSTOM_BOTTLE_SIZE_OPTIONS.map((o) => [o.code, o]));

export function normalizeBottleSizeCode(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isCustomBottleSizeCode(value: string): value is CustomBottleSizeCode {
  return BY_CODE.has(normalizeBottleSizeCode(value) as CustomBottleSizeCode);
}

export function bottleSizeLabel(code: string): string {
  return BY_CODE.get(normalizeBottleSizeCode(code) as CustomBottleSizeCode)?.label ?? code;
}

export function litersForBottleSizeCode(code: string): number | null {
  const hit = BY_CODE.get(normalizeBottleSizeCode(code) as CustomBottleSizeCode);
  if (!hit || hit.code === "catalog") return null;
  return hit.litersPerBottle;
}

/** Strip trailing size tokens so "Rhino 500ml" → "Rhino". */
export function productBaseName(name: string, batchFamily?: string | null): string {
  const family = batchFamily?.trim();
  if (family) return family;
  const trimmed = name.trim();
  const withoutSize = trimmed
    .replace(/\s*\d+(?:\.\d+)?\s*(?:ml|l(?:itre|iter)?s?)\b/gi, "")
    .replace(/\s*\(\s*pouch\s*\)/gi, " (pouch)")
    .trim();
  return withoutSize || trimmed;
}

export function composeCustomLineProductName(baseName: string, bottleSizeCode: string): string {
  const code = normalizeBottleSizeCode(bottleSizeCode);
  if (!code || code === "catalog") return baseName.trim();
  const opt = BY_CODE.get(code as CustomBottleSizeCode);
  if (!opt || opt.code === "catalog") return baseName.trim();
  const base = productBaseName(baseName);
  if (opt.code === "5l-jar") return `${base} 5 litre jar`;
  if (opt.code === "1l") return `${base} 1 litre`;
  return `${base} ${opt.nameSuffix}`;
}

export function inferLitersForCustomLine(productName: string, bottleSizeCode?: string | null): number {
  const fromCode = bottleSizeCode ? litersForBottleSizeCode(bottleSizeCode) : null;
  if (fromCode != null) return fromCode;
  return inferLitersPerBottleFromName(productName);
}

/** Round-trip saved line → UI bottle size (stored code, or infer from composed name). */
export function inferBottleSizeCodeFromSavedLine(
  productName: string,
  catalogBaseName?: string,
  storedCode?: string | null,
): string {
  const stored = normalizeBottleSizeCode(storedCode);
  if (stored && stored !== "catalog" && isCustomBottleSizeCode(stored)) return stored;

  const full = productName.trim().toLowerCase();
  const bases = [catalogBaseName, productBaseName(productName)].filter(Boolean) as string[];
  for (const base of bases) {
    if (base.trim().toLowerCase() === full) return "catalog";
    for (const opt of CUSTOM_BOTTLE_SIZE_OPTIONS) {
      if (opt.code === "catalog") continue;
      const composed = composeCustomLineProductName(base, opt.code);
      if (composed.trim().toLowerCase() === full) return opt.code;
    }
  }
  return "catalog";
}
