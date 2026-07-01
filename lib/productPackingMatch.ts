import { batchProductMatchKey, looseProductKey } from "@/lib/batchProductMatch";

export type PackingMatchRow = {
  code: string;
  name: string;
  aliases?: string[];
  batchFamily?: string | null;
};

export type PackingMatchContext = {
  /** Mixed-sample / carton label — used to infer Rhino size (e.g. "RHINO 500 ML"). */
  parentLineName?: string;
};

/** Ready-stock rows that share the same physical pool (e.g. 3 L Brighten uses 1 L shelf stock). */
const READY_STOCK_POOL_CODES: Record<string, string[]> = {
  "brighten-liquid-laundry-detergent-3ltr": [
    "brighten-liquid-laundry-detergent-3ltr",
    "brighten-liquid-laundry-detergent",
  ],
};

const SHORT_FAMILY_DEFAULT_CODE: Record<string, string> = {
  brighten: "brighten-liquid-laundry-detergent",
  fabrito: "fabrito-fabric-softener",
};

function key(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function catalogKeys(packing: PackingMatchRow): string[] {
  return [packing.name, packing.batchFamily ?? "", ...(packing.aliases ?? [])]
    .map((v) => v.trim())
    .filter(Boolean);
}

function matchKeyForName(name: string): string {
  return batchProductMatchKey(name) || looseProductKey(name);
}

function findByMatchKey(lineKey: string, catalog: PackingMatchRow[]): PackingMatchRow | null {
  if (!lineKey) return null;
  for (const packing of catalog) {
    for (const candidate of catalogKeys(packing)) {
      const candidateKey = matchKeyForName(candidate);
      if (candidateKey && candidateKey === lineKey) return packing;
      if (looseProductKey(candidate) === lineKey) return packing;
    }
  }
  return null;
}

function inferRhinoCode(parentLineName: string | undefined, catalog: PackingMatchRow[]): PackingMatchRow | null {
  const parent = looseProductKey(parentLineName ?? "");
  const pick = (code: string) => catalog.find((p) => key(p.code) === code) ?? null;
  if (parent.includes("250")) return pick("rhino-250ml");
  if (parent.includes("500")) return pick("rhino-500ml");
  if (parent.includes("750") || parent.includes("2x2")) return pick("rhino-750ml");
  return null;
}

function findWashoutByShortName(name: string, catalog: PackingMatchRow[]): PackingMatchRow | null {
  const k = key(name);
  if (!k.includes("washout") && !k.includes("washot")) return null;
  const colorMatchers: Array<{ token: string; code: string }> = [
    { token: "floral", code: "washout-floral" },
    { token: "lemon", code: "washout-lemon" },
    { token: "ocean", code: "washout-ocean" },
  ];
  for (const { token, code } of colorMatchers) {
    if (k.includes(token)) {
      return catalog.find((p) => key(p.code) === code) ?? null;
    }
  }
  return null;
}

export function familyStockKey(family: string): string {
  return `family:${family.trim().toLowerCase()}`;
}

export function isFamilyStockCode(productCode: string): boolean {
  return productCode.trim().toLowerCase().startsWith("family:");
}

export function familyFromStockCode(productCode: string): string {
  return productCode.trim().toLowerCase().slice("family:".length);
}

/** Codes to try when deducting ready stock (primary first, then shared pools). */
export function readyStockDeductionCodes(productCode: string): string[] {
  const code = key(productCode);
  return READY_STOCK_POOL_CODES[code] ?? [code];
}

export function familyKeyForLineName(name: string, catalog: PackingMatchRow[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const loose = looseProductKey(trimmed);
  const lineKey = matchKeyForName(trimmed);

  if (loose === "rhino" || lineKey === looseProductKey("RHINO 5LTR")) {
    return "rhino";
  }

  const byFamily = catalog.find((p) => key(p.batchFamily) === key(trimmed));
  if (byFamily?.batchFamily?.trim()) {
    return byFamily.batchFamily.trim().toLowerCase();
  }

  return null;
}

export function findPackingForLineName(
  name: string,
  catalog: PackingMatchRow[],
  context?: PackingMatchContext,
): PackingMatchRow | null {
  const k = key(name);
  if (!k) return null;

  let hit =
    catalog.find((p) => key(p.name) === k) ??
    catalog.find((p) => (p.aliases ?? []).some((alias) => key(alias) === k)) ??
    catalog.find((p) => key(p.batchFamily) === k) ??
    null;
  if (hit) return hit;

  const lineKey = matchKeyForName(name);
  hit = findByMatchKey(lineKey, catalog);
  if (hit) return hit;

  hit = findWashoutByShortName(name, catalog);
  if (hit) return hit;

  const loose = looseProductKey(name);
  const defaultCode = SHORT_FAMILY_DEFAULT_CODE[loose];
  if (defaultCode) {
    return catalog.find((p) => key(p.code) === defaultCode) ?? null;
  }

  if (loose === "rhino" || lineKey === looseProductKey("RHINO 5LTR")) {
    return inferRhinoCode(context?.parentLineName, catalog);
  }

  return null;
}
