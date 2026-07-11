import { inferLitersPerBottleFromName } from "@/lib/batchVolume";

export type OuterBoxOption = { code: string; label: string };

/** Generic empty custom cartons tracked by container size. */
export const CUSTOM_CARTON_SIZE_BOX_OPTIONS: OuterBoxOption[] = [
  { code: "custom-box-5l-jar", label: "5 litre jar" },
  { code: "custom-box-1l", label: "1 litre" },
  { code: "custom-box-500ml", label: "500 ml" },
  { code: "custom-box-750ml", label: "750 ml" },
  { code: "custom-box-250ml", label: "250 ml" },
  { code: "custom-box-100ml", label: "100 ml" },
];

/** Standard product-family cartons (same SKUs as full-carton BOM boxes). */
export const PRODUCT_FAMILY_BOX_OPTIONS: OuterBoxOption[] = [
  { code: "rhino-boxes-250ml", label: "Rhino box (250 ml)" },
  { code: "rhino-boxes-500ml", label: "Rhino box (500 ml)" },
  { code: "rhino-boxes-750ml", label: "Rhino box (750 ml)" },
  { code: "brighten-fabrito-boxes", label: "Brighten box" },
  { code: "brighten-fabrito-boxes", label: "Fabrito box" },
  { code: "power-wash-degreaser-boxes", label: "Power Wash box" },
  { code: "power-wash-degreaser-boxes", label: "Degrease box" },
  { code: "wash-out-boxes", label: "Washout box" },
  { code: "fabrito-brighten-pw-pouch-box", label: "Pouch box (Brighten / Fabrito / Power Wash)" },
  { code: "titan-box-500g", label: "Titan box (500 g)" },
  { code: "titan-box-1250g", label: "Titan box (1.25 kg)" },
  { code: "cpl-cpm-210ml-box", label: "CPL / CPM box (210 ml)" },
  { code: "cpl-cpm-55ml-big-box", label: "CPL / CPM box (55 ml — outer)" },
];

/** @deprecated Use grouped exports; kept for imports that expect a flat list. */
export const CUSTOM_CARTON_BOX_OPTIONS: OuterBoxOption[] = [
  ...CUSTOM_CARTON_SIZE_BOX_OPTIONS,
  ...PRODUCT_FAMILY_BOX_OPTIONS,
];

export type CustomCartonBoxCode = string;

const CODES = new Set<string>(
  [...CUSTOM_CARTON_SIZE_BOX_OPTIONS, ...PRODUCT_FAMILY_BOX_OPTIONS].map((o) => o.code),
);

/** Map catalog product code → default outer box SKU for custom cartons. */
const PRODUCT_BOX_BY_PACKING_CODE: Record<string, string> = {
  "rhino-250ml": "rhino-boxes-250ml",
  "rhino-500ml": "rhino-boxes-500ml",
  "rhino-750ml": "rhino-boxes-750ml",
  "rhino-2x2-750ml": "rhino-boxes-750ml",
  "brighten-liquid-laundry-detergent": "brighten-fabrito-boxes",
  "brighten-liquid-laundry-detergent-3ltr": "brighten-fabrito-boxes",
  "brighten-laundry-detergent-pouch": "fabrito-brighten-pw-pouch-box",
  "fabrito-fabric-softener": "brighten-fabrito-boxes",
  "fabrito-fabric-softener-pouch": "fabrito-brighten-pw-pouch-box",
  "power-wash": "power-wash-degreaser-boxes",
  "power-wash-pouch": "fabrito-brighten-pw-pouch-box",
  "degrease-spray": "power-wash-degreaser-boxes",
  "power-wash-dish-degrease-bundle": "power-wash-degreaser-boxes",
  "brighten-fabrito-bundle-1l": "brighten-fabrito-boxes",
  "washout-floral": "wash-out-boxes",
  "washout-lemon": "wash-out-boxes",
  "washout-ocean": "wash-out-boxes",
  "titan-500g": "titan-box-500g",
  "titan-1250g": "titan-box-1250g",
  "titan": "titan-box-1250g",
  "cpl-55ml": "cpl-cpm-55ml-big-box",
  "cpm-55ml": "cpl-cpm-55ml-big-box",
  "cpl-210ml": "cpl-cpm-210ml-box",
  "cpm-210ml": "cpl-cpm-210ml-box",
};

export function normalizeCustomBoxCode(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isCustomCartonBoxCode(value: string | null | undefined): value is CustomCartonBoxCode {
  return CODES.has(normalizeCustomBoxCode(value));
}

export function assertValidCustomBoxCode(value: string | null | undefined): string | null {
  const code = normalizeCustomBoxCode(value);
  if (!code) return "Outer box size is required for custom cartons.";
  if (!CODES.has(code)) return "Invalid custom outer box size.";
  return null;
}

export function customCartonBoxLabel(code: string): string {
  const normalized = normalizeCustomBoxCode(code);
  const hit =
    CUSTOM_CARTON_SIZE_BOX_OPTIONS.find((o) => o.code === normalized) ??
    PRODUCT_FAMILY_BOX_OPTIONS.find((o) => o.code === normalized);
  if (hit) return hit.label;
  return code.replace(/-/g, " ");
}

function packingCodeForProductName(
  productName: string,
  catalog: Array<{ code: string; name: string }>,
): string | null {
  const key = productName.trim().toLowerCase();
  const exact = catalog.find((p) => p.name.trim().toLowerCase() === key);
  if (exact) return exact.code;
  const partial = catalog.find((p) => p.name.trim().toLowerCase().includes(key));
  if (partial) return partial.code;
  const reverse = catalog.find((p) => key.includes(p.name.trim().toLowerCase()));
  return reverse?.code ?? null;
}

/** Suggest outer box from carton contents — product-family box when unambiguous, else by size. */
export function suggestCustomBoxCodeFromContents(
  contents: Array<{ productName: string; bottles: number }>,
  catalog: Array<{ code: string; name: string; litersPerBottle?: number | null }>,
): CustomCartonBoxCode | "" {
  const boxVotes = new Map<string, number>();
  for (const part of contents) {
    const packingCode = packingCodeForProductName(part.productName, catalog);
    if (!packingCode) continue;
    const boxCode = PRODUCT_BOX_BY_PACKING_CODE[packingCode];
    if (!boxCode || !CODES.has(boxCode)) continue;
    boxVotes.set(boxCode, (boxVotes.get(boxCode) ?? 0) + part.bottles);
  }
  if (boxVotes.size === 1) {
    return [...boxVotes.keys()][0]!;
  }

  let maxLiters = 0;
  for (const part of contents) {
    const key = part.productName.trim().toLowerCase();
    const packing =
      catalog.find((p) => p.name.trim().toLowerCase() === key) ??
      catalog.find((p) => p.name.trim().toLowerCase().includes(key));
    const lp = packing?.litersPerBottle ?? inferLitersPerBottleFromName(part.productName);
    if (lp > maxLiters) maxLiters = lp;
  }
  if (maxLiters >= 5) return "custom-box-5l-jar";
  if (maxLiters >= 1) return "custom-box-1l";
  if (maxLiters >= 0.75) return "custom-box-750ml";
  if (maxLiters >= 0.5) return "custom-box-500ml";
  if (maxLiters >= 0.25) return "custom-box-250ml";
  if (maxLiters > 0) return "custom-box-100ml";
  return "";
}
