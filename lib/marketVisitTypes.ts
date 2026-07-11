import { MARKET_VISIT_SKU_KEYS, type MarketVisitSkuKey } from "@/lib/marketVisitCatalog";

export type MarketVisitAvailabilityValue = "yes" | "no" | "";

export type MarketVisitRow = {
  storeName: string;
  location: string;
  availability: Record<string, MarketVisitAvailabilityValue>;
  facingUnits: Record<string, number | null>;
  remarks: string;
};

export const VISIT_KINDS = ["sales", "market_audit"] as const;
export type VisitKind = (typeof VISIT_KINDS)[number];

export const VISIT_KIND_LABELS: Record<VisitKind, string> = {
  sales: "Sales visit",
  market_audit: "Market visit",
};

export function emptyAvailability(): Record<string, MarketVisitAvailabilityValue> {
  const out: Record<string, MarketVisitAvailabilityValue> = {};
  for (const key of MARKET_VISIT_SKU_KEYS) out[key] = "";
  return out;
}

export function emptyFacingUnits(): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const key of MARKET_VISIT_SKU_KEYS) out[key] = null;
  return out;
}

export function createEmptyMarketVisitRow(): MarketVisitRow {
  return {
    storeName: "",
    location: "",
    availability: emptyAvailability(),
    facingUnits: emptyFacingUnits(),
    remarks: "",
  };
}

export function createEmptyMarketVisitRows(count: number): MarketVisitRow[] {
  return Array.from({ length: count }, () => createEmptyMarketVisitRow());
}

function isAvailabilityValue(v: unknown): v is MarketVisitAvailabilityValue {
  return v === "yes" || v === "no" || v === "";
}

function mapToPlainRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  if (raw instanceof Map) {
    return Object.fromEntries(raw.entries());
  }
  return raw as Record<string, unknown>;
}

export function parseAvailabilityRecord(raw: unknown): Record<string, MarketVisitAvailabilityValue> {
  const base = emptyAvailability();
  const src = mapToPlainRecord(raw);
  for (const key of MARKET_VISIT_SKU_KEYS) {
    const v = src[key];
    if (isAvailabilityValue(v)) base[key] = v;
  }
  return base;
}

export function parseFacingUnitsRecord(raw: unknown): Record<string, number | null> {
  const base = emptyFacingUnits();
  const src = mapToPlainRecord(raw);
  for (const key of MARKET_VISIT_SKU_KEYS) {
    const v = src[key];
    if (v === null || v === undefined || v === "") {
      base[key] = null;
      continue;
    }
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isInteger(n) && n >= 0) base[key] = n;
  }
  return base;
}

export function parseMarketVisitRow(raw: unknown): MarketVisitRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  return {
    storeName: typeof row.storeName === "string" ? row.storeName.trim() : "",
    location: typeof row.location === "string" ? row.location.trim() : "",
    availability: parseAvailabilityRecord(row.availability),
    facingUnits: parseFacingUnitsRecord(row.facingUnits),
    remarks: typeof row.remarks === "string" ? row.remarks.trim() : "",
  };
}

export function parseMarketVisitRows(raw: unknown): MarketVisitRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: MarketVisitRow[] = [];
  for (const item of raw) {
    const row = parseMarketVisitRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export function serializeMarketVisitRow(row: MarketVisitRow) {
  return {
    storeName: row.storeName,
    location: row.location,
    availability: { ...row.availability },
    facingUnits: { ...row.facingUnits },
    remarks: row.remarks,
  };
}

export function rowHasMarketData(row: MarketVisitRow): boolean {
  if (row.storeName || row.location || row.remarks) return true;
  for (const key of MARKET_VISIT_SKU_KEYS) {
    if (row.availability[key]) return true;
    if (row.facingUnits[key] != null) return true;
  }
  return false;
}

export function isValidSkuKey(key: string): key is MarketVisitSkuKey {
  return (MARKET_VISIT_SKU_KEYS as readonly string[]).includes(key);
}
