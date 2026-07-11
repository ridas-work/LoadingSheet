import type { DeductionPacking, DeductionSheetLine } from "@/lib/packagingDeduction";
import { isDrumContainerProduct } from "@/lib/customBottleSizes";
import { isMixedSampleLine } from "@/lib/mixedSampleBox";
import { bottlesPerProductFromSheetLines } from "@/lib/bottlesFromSheetLines";

export const DELIVERY_OUTCOMES = ["full", "partial"] as const;
export type DeliveryOutcome = (typeof DELIVERY_OUTCOMES)[number];

export type DeliveryClosureLine = {
  productCode: string;
  productName: string;
  dispatchedBottles: number;
  deliveredBottles: number;
  damagedBottles: number;
  returnedBottles: number;
};

export type DeliveryClosurePayload = {
  outcome: DeliveryOutcome;
  lines: DeliveryClosureLine[];
};

export type LateReturnLine = {
  productCode: string;
  productName: string;
  damagedBottles: number;
  returnedBottles: number;
};

export type LateReturnPayload = {
  note: string;
  lines: LateReturnLine[];
};

export type DeliveryLateReturnRecord = LateReturnPayload & {
  recordedAt: string;
  recordedByName: string;
};

export type NormalizedClosureDisplay = {
  outcome: DeliveryOutcome;
  orderClosedAt: string | null;
  orderClosedByName: string;
  lines: DeliveryClosureLine[];
  lateReturns: DeliveryLateReturnRecord[];
  totals: {
    deliveredBottles: number;
    /** Loading-sheet bottle total for order-level UI (bundle rows count once). */
    displayDeliveredBottles: number;
    damagedBottles: number;
    returnedBottles: number;
  };
};

/** Sum bottles as shown on the loading sheet (one row = one carton). */
export function totalLoadingSheetBottles(sheetLines: DeductionSheetLine[]): number {
  let total = 0;
  for (const line of sheetLines) {
    if (!isMixedSampleLine(line) && isDrumContainerProduct(line.productName)) continue;
    if (isMixedSampleLine(line) && line.mixedContents?.length) {
      for (const part of line.mixedContents) {
        if (isDrumContainerProduct(part.productName, part.bottleSizeCode)) continue;
        total += Math.max(0, part.bottles ?? 0);
      }
      continue;
    }
    total += Math.max(0, Math.floor(line.bottlesPerBox) || 0);
  }
  return total;
}

function displayDeliveredBottleTotal(args: {
  outcome: DeliveryOutcome;
  lines: DeliveryClosureLine[];
  componentDelivered: number;
  sheetLines: DeductionSheetLine[];
}): number {
  const sheetTotal = totalLoadingSheetBottles(args.sheetLines);
  if (sheetTotal <= 0) return args.componentDelivered;

  const componentDispatched = args.lines.reduce((sum, line) => sum + line.dispatchedBottles, 0);
  if (componentDispatched <= 0) return args.componentDelivered;

  if (args.outcome === "full") return sheetTotal;

  return Math.min(
    sheetTotal,
    Math.round(sheetTotal * (args.componentDelivered / componentDispatched)),
  );
}

function parseNonNegInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    if (Number.isInteger(n) && n >= 0) return n;
  }
  return null;
}

export function buildClosureLinesFromOrder(
  sheetLines: DeductionSheetLine[],
  catalog: DeductionPacking[],
): DeliveryClosureLine[] {
  const { needs } = bottlesPerProductFromSheetLines(sheetLines, catalog);
  return needs.map((n) => ({
    productCode: n.productCode,
    productName: n.productName,
    dispatchedBottles: n.bottles,
    deliveredBottles: n.bottles,
    damagedBottles: 0,
    returnedBottles: 0,
  }));
}

function lineKey(code: string, name: string): string {
  return `${code.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
}

export function catalogProductOptions(
  catalog: DeductionPacking[],
): Array<{ productCode: string; productName: string }> {
  return catalog
    .map((p) => ({
      productCode: p.code.trim().toLowerCase(),
      productName: p.name.trim(),
    }))
    .filter((p) => p.productCode && p.productName)
    .sort((a, b) => a.productName.localeCompare(b.productName, undefined, { sensitivity: "base" }));
}

export function parseDeliveryClosureBody(
  raw: unknown,
  dispatchedLines: DeliveryClosureLine[],
  catalog: DeductionPacking[] = [],
): { ok: true; payload: DeliveryClosurePayload } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: { closure: "Closure details are required when marking delivered." } };
  }

  const outcomeRaw = (raw as { outcome?: unknown }).outcome;
  const outcome: DeliveryOutcome =
    outcomeRaw === "partial" ? "partial" : outcomeRaw === "full" ? "full" : (null as never);

  if (outcome !== "full" && outcome !== "partial") {
    errors.outcome = 'Choose "full" or "partial" delivery.';
    return { ok: false, errors };
  }

  const dispatchedByKey = new Map(
    dispatchedLines.map((l) => [lineKey(l.productCode, l.productName), l]),
  );
  const catalogByCode = new Map(
    catalog.map((p) => [p.code.trim().toLowerCase(), p]),
  );

  if (outcome === "full") {
    const lines = dispatchedLines.map((d) => ({
      ...d,
      deliveredBottles: d.dispatchedBottles,
      damagedBottles: 0,
      returnedBottles: 0,
    }));
    return { ok: true, payload: { outcome: "full", lines } };
  }

  const rawLines = (raw as { lines?: unknown }).lines;
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    errors.lines = "Enter delivered, damaged, and returned counts for each product.";
    return { ok: false, errors };
  }

  const lines: DeliveryClosureLine[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < rawLines.length; i++) {
    const row = rawLines[i];
    if (!row || typeof row !== "object") {
      errors[`lines.${i}`] = "Invalid row.";
      continue;
    }
    const productCode =
      typeof (row as { productCode?: unknown }).productCode === "string"
        ? (row as { productCode: string }).productCode.trim().toLowerCase()
        : "";
    const productName =
      typeof (row as { productName?: unknown }).productName === "string"
        ? (row as { productName: string }).productName.trim()
        : "";

    const deliveredBottles = parseNonNegInt((row as { deliveredBottles?: unknown }).deliveredBottles);
    const damagedBottles = parseNonNegInt((row as { damagedBottles?: unknown }).damagedBottles);
    const returnedBottles = parseNonNegInt((row as { returnedBottles?: unknown }).returnedBottles);

    if (deliveredBottles === null || damagedBottles === null || returnedBottles === null) {
      errors[`lines.${i}`] = "All bottle counts must be whole numbers ≥ 0.";
      continue;
    }

    const dispatched = dispatchedByKey.get(lineKey(productCode, productName));
    if (dispatched) {
      if (seenKeys.has(lineKey(productCode, productName))) {
        errors[`lines.${i}`] = `Duplicate product: ${productName}`;
        continue;
      }
      seenKeys.add(lineKey(productCode, productName));

      if (deliveredBottles > dispatched.dispatchedBottles) {
        errors[`lines.${i}`] =
          `Delivered (${deliveredBottles}) cannot exceed dispatched (${dispatched.dispatchedBottles}).`;
        continue;
      }

      lines.push({
        productCode: dispatched.productCode,
        productName: dispatched.productName,
        dispatchedBottles: dispatched.dispatchedBottles,
        deliveredBottles,
        damagedBottles,
        returnedBottles,
      });
      continue;
    }

    const catalogRow = catalogByCode.get(productCode);
    if (!catalogRow) {
      errors[`lines.${i}`] = `Unknown product: ${productName || productCode || "?"}`;
      continue;
    }
    if (seenKeys.has(productCode)) {
      errors[`lines.${i}`] = `Duplicate product: ${catalogRow.name}`;
      continue;
    }
    seenKeys.add(productCode);

    if (deliveredBottles !== 0) {
      errors[`lines.${i}`] = "Past-return products cannot have delivered bottles — use damaged/returned only.";
      continue;
    }
    if (damagedBottles + returnedBottles < 1) {
      errors[`lines.${i}`] = "Enter at least one damaged or returned bottle for past-return products.";
      continue;
    }

    lines.push({
      productCode: catalogRow.code.trim().toLowerCase(),
      productName: catalogRow.name.trim(),
      dispatchedBottles: 0,
      deliveredBottles: 0,
      damagedBottles,
      returnedBottles,
    });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (lines.length === 0) {
    return { ok: false, errors: { lines: "No valid product lines." } };
  }

  const hasPartialActivity = lines.some(
    (l) =>
      l.damagedBottles > 0 ||
      l.returnedBottles > 0 ||
      (l.dispatchedBottles > 0 && l.deliveredBottles < l.dispatchedBottles),
  );
  if (!hasPartialActivity) {
    errors.outcome =
      "Partial close needs returns (damaged or good) and/or delivered less than dispatched.";
    return { ok: false, errors };
  }

  return { ok: true, payload: { outcome: "partial", lines } };
}

export function parseLateReturnBody(
  raw: unknown,
  knownProducts: Array<{ productCode: string; productName: string }>,
): { ok: true; payload: LateReturnPayload } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: { body: "Invalid request body." } };
  }

  const note =
    typeof (raw as { note?: unknown }).note === "string" ? (raw as { note: string }).note.trim() : "";

  const rawLines = (raw as { lines?: unknown }).lines;
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    errors.lines = "Enter at least one product with returned or damaged bottles.";
    return { ok: false, errors };
  }

  const knownByCode = new Map(knownProducts.map((p) => [p.productCode.trim().toLowerCase(), p]));

  const lines: LateReturnLine[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const row = rawLines[i];
    if (!row || typeof row !== "object") {
      errors[`lines.${i}`] = "Invalid row.";
      continue;
    }
    const productCode =
      typeof (row as { productCode?: unknown }).productCode === "string"
        ? (row as { productCode: string }).productCode.trim().toLowerCase()
        : "";
    const known = knownByCode.get(productCode);
    if (!known) {
      errors[`lines.${i}`] = "Unknown product.";
      continue;
    }

    const damagedBottles = parseNonNegInt((row as { damagedBottles?: unknown }).damagedBottles) ?? 0;
    const returnedBottles = parseNonNegInt((row as { returnedBottles?: unknown }).returnedBottles) ?? 0;

    if (damagedBottles + returnedBottles < 1) {
      errors[`lines.${i}`] = "Enter at least one damaged or returned bottle.";
      continue;
    }

    lines.push({
      productCode: known.productCode,
      productName: known.productName,
      damagedBottles,
      returnedBottles,
    });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, payload: { note, lines } };
}

type OrderClosureSource = {
  deliveryOutcome?: string | null;
  orderClosedAt?: Date | string | null;
  orderClosedByName?: string | null;
  deliveryClosureLines?: Array<{
    productCode?: string;
    productName?: string;
    dispatchedBottles?: number;
    deliveredBottles?: number;
    damagedBottles?: number;
    returnedBottles?: number;
  }> | null;
  deliveryLateReturns?: Array<{
    note?: string | null;
    recordedAt?: Date | string;
    recordedByName?: string | null;
    lines?: Array<{
      productCode?: string;
      productName?: string;
      damagedBottles?: number;
      returnedBottles?: number;
    }>;
  }> | null;
  sheetLines?: DeductionSheetLine[];
};

export function normalizeClosureForDisplay(
  order: OrderClosureSource,
  catalog: DeductionPacking[],
): NormalizedClosureDisplay {
  const legacyLines = buildClosureLinesFromOrder(
    (order.sheetLines ?? []) as DeductionSheetLine[],
    catalog,
  );

  const stored = (order.deliveryClosureLines ?? []).map((l) => ({
    productCode: l.productCode?.trim().toLowerCase() ?? "",
    productName: l.productName?.trim() ?? "",
    dispatchedBottles: typeof l.dispatchedBottles === "number" ? l.dispatchedBottles : 0,
    deliveredBottles: typeof l.deliveredBottles === "number" ? l.deliveredBottles : 0,
    damagedBottles: typeof l.damagedBottles === "number" ? l.damagedBottles : 0,
    returnedBottles: typeof l.returnedBottles === "number" ? l.returnedBottles : 0,
  }));

  const lines =
    stored.length > 0
      ? stored
      : legacyLines.map((l) => ({
          ...l,
          deliveredBottles: l.dispatchedBottles,
          damagedBottles: 0,
          returnedBottles: 0,
        }));

  const lateReturns: DeliveryLateReturnRecord[] = (order.deliveryLateReturns ?? []).map((r) => ({
    note: r.note?.trim() ?? "",
    recordedAt: r.recordedAt ? new Date(r.recordedAt).toISOString() : "",
    recordedByName: r.recordedByName?.trim() ?? "",
    lines: (r.lines ?? []).map((l) => ({
      productCode: l.productCode?.trim().toLowerCase() ?? "",
      productName: l.productName?.trim() ?? "",
      damagedBottles: typeof l.damagedBottles === "number" ? l.damagedBottles : 0,
      returnedBottles: typeof l.returnedBottles === "number" ? l.returnedBottles : 0,
    })),
  }));

  let deliveredBottles = lines.reduce((s, l) => s + l.deliveredBottles, 0);
  let damagedBottles = lines.reduce((s, l) => s + l.damagedBottles, 0);
  let returnedBottles = lines.reduce((s, l) => s + l.returnedBottles, 0);

  for (const ev of lateReturns) {
    for (const l of ev.lines) {
      damagedBottles += l.damagedBottles;
      returnedBottles += l.returnedBottles;
    }
  }

  const outcome: DeliveryOutcome =
    order.deliveryOutcome === "partial" ? "partial" : "full";

  return {
    outcome,
    orderClosedAt: order.orderClosedAt ? new Date(order.orderClosedAt).toISOString() : null,
    orderClosedByName: order.orderClosedByName?.trim() ?? "",
    lines,
    lateReturns,
    totals: {
      deliveredBottles,
      displayDeliveredBottles: displayDeliveredBottleTotal({
        outcome,
        lines,
        componentDelivered: deliveredBottles,
        sheetLines: (order.sheetLines ?? []) as DeductionSheetLine[],
      }),
      damagedBottles,
      returnedBottles,
    },
  };
}

export function closureProductOptions(
  order: OrderClosureSource,
  catalog: DeductionPacking[],
  options?: { includeFullCatalog?: boolean },
): Array<{ productCode: string; productName: string }> {
  if (options?.includeFullCatalog) {
    return catalogProductOptions(catalog);
  }

  const display = normalizeClosureForDisplay(order, catalog);
  const seen = new Set<string>();
  const out: Array<{ productCode: string; productName: string }> = [];
  for (const l of display.lines) {
    const k = l.productCode;
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ productCode: l.productCode, productName: l.productName });
  }
  if (out.length > 0) return out;
  return buildClosureLinesFromOrder(
    (order.sheetLines ?? []) as DeductionSheetLine[],
    catalog,
  ).map((l) => ({ productCode: l.productCode, productName: l.productName }));
}
