import { inferLitersPerBottleFromName } from "@/lib/batchVolume";

/** Container sizes PO team can assign per line inside a custom carton. */
export const CUSTOM_BOTTLE_SIZE_OPTIONS = [
  { code: "catalog", label: "As in catalog" },
  { code: "5l-jar", label: "5 kg / litre jar", nameSuffix: "5 litre jar", litersPerBottle: 5 },
  { code: "1l", label: "1 litre", nameSuffix: "1 litre", litersPerBottle: 1 },
  { code: "500ml", label: "500 ml", nameSuffix: "500ml", litersPerBottle: 0.5 },
  { code: "750ml", label: "750 ml", nameSuffix: "750ml", litersPerBottle: 0.75 },
  { code: "250ml", label: "250 ml", nameSuffix: "250ml", litersPerBottle: 0.25 },
  { code: "100ml", label: "100 ml", nameSuffix: "100ml", litersPerBottle: 0.1 },
  { code: "25l-can", label: "25 Ltr/Kg Can", nameSuffix: "25 Ltr/Kg Can", litersPerBottle: 25 },
  { code: "120l-drum", label: "120 Litre Drum", nameSuffix: "120 litre drum", litersPerBottle: 120 },
  { code: "150l-drum", label: "150 Litre Drum", nameSuffix: "150 litre drum", litersPerBottle: 150 },
  { code: "200l-drum", label: "200 Litre Drum", nameSuffix: "200 litre drum", litersPerBottle: 200 },
] as const;

export type CustomBottleSizeCode = (typeof CUSTOM_BOTTLE_SIZE_OPTIONS)[number]["code"];

const BY_CODE = new Map(CUSTOM_BOTTLE_SIZE_OPTIONS.map((o) => [o.code, o]));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove container-size tokens from a PO line name so it can match Nimra batch names.
 * Handles doubled suffixes like "HAND WASH 25 Ltr/Kg Can 25 Ltr/Kg Can".
 */
export function stripCustomContainerSuffixes(name: string): string {
  let result = name.trim();
  if (!result) return "";

  const suffixPatterns = [
    ...CUSTOM_BOTTLE_SIZE_OPTIONS.filter((o) => o.code !== "catalog")
      .flatMap((o) => [o.nameSuffix, o.label])
      .sort((a, b) => b.length - a.length),
    "5 litre jar",
  ];

  for (let pass = 0; pass < 6; pass++) {
    const prev = result;
    for (const suffix of suffixPatterns) {
      result = result.replace(new RegExp(`\\s*${escapeRegExp(suffix)}`, "gi"), " ");
    }
    result = result
      .replace(/\b\d+(?:\.\d+)?\s*ltr\s*\/?\s*kg(?:\/kg)?(?:\s*can)?\b/gi, " ")
      .replace(/\b\d+(?:\.\d+)?\s*(?:ml|l(?:itre|iter)?s?|ltr|kg)\b/gi, " ")
      .replace(/\/?\s*kg\b/gi, " ")
      .replace(/\b(?:jar|drum|bottle|can|pouch)\b/gi, " ")
      .replace(/\s*[×x]\s*\d+\s*$/i, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (result === prev) break;
  }

  return result;
}

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

const DRUM_BOTTLE_SIZE_CODES = new Set<CustomBottleSizeCode>([
  "25l-can",
  "120l-drum",
  "150l-drum",
  "200l-drum",
]);

/** Container sizes where delivery deducts only the matching jar/box SKU × bottle qty — no BOM. */
const JAR_ONLY_DEDUCTION_SIZE_CODES = new Set<CustomBottleSizeCode>([
  "5l-jar",
  "1l",
  "500ml",
  "750ml",
  "250ml",
  "100ml",
]);

const JAR_PACKAGING_BY_SIZE: Partial<Record<CustomBottleSizeCode, string>> = {
  "5l-jar": "custom-box-5l-jar",
  "1l": "custom-box-1l",
  "500ml": "custom-box-500ml",
  "750ml": "custom-box-750ml",
  "250ml": "custom-box-250ml",
  "100ml": "custom-box-100ml",
};

export function isJarOnlyDeductionBottleSize(code: string | null | undefined): boolean {
  return JAR_ONLY_DEDUCTION_SIZE_CODES.has(normalizeBottleSizeCode(code) as CustomBottleSizeCode);
}

/** Bulk drums/cans ship without packaging inventory deduction. */
export function isNoPackagingDeductionBottleSize(code: string | null | undefined): boolean {
  return isDrumBottleSizeCode(code);
}

export function jarPackagingCodeForBottleSize(code: string | null | undefined): string | null {
  const normalized = normalizeBottleSizeCode(code);
  return JAR_PACKAGING_BY_SIZE[normalized as CustomBottleSizeCode] ?? null;
}

/** Jar-only deduction for a sheet line or mixed row (infers size from name when needed). */
export function jarPackagingDeductionForLine(args: {
  productName: string;
  bottleSizeCode?: string | null;
  bottleCount: number;
}): { jarCode: string; quantity: number } | null {
  const sizeCode = inferBottleSizeCodeFromSavedLine(
    args.productName,
    undefined,
    args.bottleSizeCode,
  );
  if (!isJarOnlyDeductionBottleSize(sizeCode)) return null;
  const jarCode = jarPackagingCodeForBottleSize(sizeCode);
  if (!jarCode || args.bottleCount <= 0) return null;
  return { jarCode, quantity: args.bottleCount };
}

export function isJarOnlyContainerLine(
  productName: string,
  bottleSizeCode?: string | null,
): boolean {
  return Boolean(jarPackagingDeductionForLine({ productName, bottleSizeCode, bottleCount: 1 }));
}

export function isDrumBottleSizeCode(code: string | null | undefined): boolean {
  const normalized = normalizeBottleSizeCode(code);
  return DRUM_BOTTLE_SIZE_CODES.has(normalized as CustomBottleSizeCode);
}

/** Bulk drums/cans are filled at customer — no bottle/cap/carton stock on delivery. */
export function isDrumContainerProduct(productName: string, bottleSizeCode?: string | null): boolean {
  if (isNoPackagingDeductionBottleSize(bottleSizeCode)) return true;
  if (isNoPackagingDeductionBottleSize(inferBottleSizeCodeFromSavedLine(productName))) return true;
  return /\d+\s*(?: litre)?\s*drum\b/i.test(productName.trim());
}

/** Strip trailing size tokens so "Rhino 500ml" → "Rhino". */
export function productBaseName(name: string, batchFamily?: string | null): string {
  const family = batchFamily?.trim();
  if (family) return family;
  const trimmed = stripCustomContainerSuffixes(name);
  const withoutSize = trimmed
    .replace(/\s*\d+(?:\.\d+)?\s*(?:ml|l(?:itre|iter)?s?)\b/gi, "")
    .replace(/\s*\(\s*pouch\s*\)/gi, " (pouch)")
    .trim();
  return withoutSize || trimmed;
}

/** Free-text PO line (other product row) with optional container size. */
export function resolvedFreeTextProductName(baseName: string, bottleSizeCode?: string | null): string {
  const base = productBaseName(baseName);
  if (!base) return "";
  return composeCustomLineProductName(base, bottleSizeCode || "catalog");
}

export function composeCustomLineProductName(baseName: string, bottleSizeCode: string): string {
  const trimmed = baseName.trim();
  if (!trimmed) return "";
  const code = normalizeBottleSizeCode(bottleSizeCode);
  if (!code || code === "catalog") return trimmed;
  const opt = BY_CODE.get(code as CustomBottleSizeCode);
  if (!opt || opt.code === "catalog") return trimmed;

  // Pouch SKUs are already unambiguous in the catalog name.
  if (/\(pouch\)/i.test(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.includes(opt.nameSuffix.toLowerCase()) || lower.includes(opt.label.toLowerCase())) {
    return trimmed;
  }

  if (opt.code === "5l-jar") return `${trimmed} 5 litre jar`;
  if (opt.code === "1l") return `${trimmed} 1 litre`;
  return `${trimmed} ${opt.nameSuffix}`;
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

  const rawLower = productName.trim().toLowerCase();
  for (const opt of [...CUSTOM_BOTTLE_SIZE_OPTIONS]
    .filter((o) => o.code !== "catalog" && "nameSuffix" in o)
    .sort((a, b) => b.nameSuffix.length - a.nameSuffix.length)) {
    if (
      rawLower.includes(opt.nameSuffix.toLowerCase()) ||
      rawLower.includes(opt.label.toLowerCase())
    ) {
      return opt.code;
    }
  }

  const full = stripCustomContainerSuffixes(productName).trim().toLowerCase();
  const bases = [catalogBaseName, productBaseName(productName)]
    .map((b) => stripCustomContainerSuffixes(b ?? "").trim().toLowerCase())
    .filter(Boolean) as string[];
  for (const base of bases) {
    if (base === full) return "catalog";
    for (const opt of CUSTOM_BOTTLE_SIZE_OPTIONS) {
      if (opt.code === "catalog") continue;
      const composed = composeCustomLineProductName(base, opt.code);
      if (composed.trim().toLowerCase() === full) return opt.code;
    }
  }
  return "catalog";
}
