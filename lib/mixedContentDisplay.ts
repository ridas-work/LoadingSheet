import { bottleSizeLabel, composeCustomLineProductName } from "@/lib/customBottleSizes";

export type MixedContentDisplayRow = {
  productName: string;
  bottles: number;
  bottleSizeCode?: string;
  packingCode?: string;
};

export type CatalogNameRow = {
  code: string;
  name: string;
};

function isPouchProductName(name: string): boolean {
  return /\(pouch\)/i.test(name);
}

function unitForProductName(name: string): string {
  return isPouchProductName(name) ? "pouch" : "bottle";
}

function pluralUnit(unit: string, qty: number): string {
  if (qty === 1) return unit;
  return unit === "pouch" ? "pouches" : "bottles";
}

/** Resolve display name from catalog code when stored on the line. */
export function resolveMixedContentDisplayName(
  row: MixedContentDisplayRow,
  catalog?: CatalogNameRow[],
): string {
  let name = row.productName.trim();
  const code = row.packingCode?.trim();
  if (code && catalog?.length) {
    const hit = catalog.find((p) => p.code === code);
    if (hit?.name.trim()) name = hit.name.trim();
  }
  const sizeCode = (row.bottleSizeCode ?? "").trim();
  if (sizeCode && sizeCode !== "catalog") {
    name = composeCustomLineProductName(name, sizeCode);
  }
  return name;
}

/** One product line inside a custom / mixed carton — e.g. "Fabrito Fabric Softener (pouch) — 6 pouches". */
export function formatMixedContentLine(
  row: MixedContentDisplayRow,
  catalog?: CatalogNameRow[],
): string {
  const name = resolveMixedContentDisplayName(row, catalog);
  const qty = row.bottles;
  const unit = pluralUnit(unitForProductName(name), qty);
  const sizeCode = (row.bottleSizeCode ?? "").trim().toLowerCase();
  const sizeSuffix =
    sizeCode && sizeCode !== "catalog" && !name.toLowerCase().includes(bottleSizeLabel(sizeCode).toLowerCase())
      ? ` · ${bottleSizeLabel(sizeCode)}`
      : "";
  return `${name} — ${qty} ${unit}${sizeSuffix}`;
}

/** Sheet / pending title for a multi-product carton (no truncation). */
export function formatMixedCartonSummaryLabel(
  contents: MixedContentDisplayRow[],
  catalog?: CatalogNameRow[],
  prefix = "Custom box",
): string {
  const lines = contents
    .filter((c) => c.productName.trim() && c.bottles >= 1)
    .map((c) => {
      const name = resolveMixedContentDisplayName(c, catalog);
      return `${name} ×${c.bottles}`;
    });
  if (lines.length === 0) return prefix;
  return `${prefix}: ${lines.join(", ")}`;
}
