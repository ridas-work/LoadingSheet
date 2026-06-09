import { inferLitersPerBottleFromName } from "@/lib/batchVolume";

export const CUSTOM_CARTON_BOX_OPTIONS = [
  { code: "custom-box-5l-jar", label: "5 litre jar" },
  { code: "custom-box-1l", label: "1 litre" },
  { code: "custom-box-500ml", label: "500 ml" },
  { code: "custom-box-250ml", label: "250 ml" },
  { code: "custom-box-100ml", label: "100 ml" },
] as const;

export type CustomCartonBoxCode = (typeof CUSTOM_CARTON_BOX_OPTIONS)[number]["code"];

const CODES = new Set<string>(CUSTOM_CARTON_BOX_OPTIONS.map((o) => o.code));

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
  const hit = CUSTOM_CARTON_BOX_OPTIONS.find((o) => o.code === normalizeCustomBoxCode(code));
  return hit?.label ?? code;
}

/** Suggest outer box from largest liters-per-bottle in carton contents. */
export function suggestCustomBoxCodeFromContents(
  contents: Array<{ productName: string; bottles: number }>,
  catalog: Array<{ name: string; litersPerBottle?: number | null }>,
): CustomCartonBoxCode | "" {
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
  if (maxLiters >= 0.5) return "custom-box-500ml";
  if (maxLiters >= 0.25) return "custom-box-250ml";
  if (maxLiters > 0) return "custom-box-100ml";
  return "";
}
