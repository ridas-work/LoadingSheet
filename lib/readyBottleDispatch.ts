import type { DeliveryClosureLine, LateReturnLine } from "@/lib/gateDeliveryClosure";
import { bottlesPerProductFromSheetLines } from "@/lib/bottlesFromSheetLines";
import { isDrumContainerProduct, isJarOnlyContainerLine } from "@/lib/customBottleSizes";
import type { DeductionPacking, DeductionSheetLine } from "@/lib/packagingDeduction";
import {
  familyFromStockCode,
  isFamilyStockCode,
  readyStockDeductionCodes,
} from "@/lib/productPackingMatch";
import {
  applyReadyBatchLotDelta,
  applyReadyBottleDelta,
  getReadyStockMap,
  listBatchLots,
} from "@/lib/readyBottleLedger";
import {
  allocateReadyStockToLines,
  type ReadyBatchLotInput,
  type ReadyLotDeduction,
} from "@/lib/readyStockAllocation";

export type ReadyDeductionLotLine = {
  batchNo: string;
  bottles: number;
};

export type ReadyDeductionSummaryLine = {
  productCode: string;
  productName: string;
  bottles: number;
  lots?: ReadyDeductionLotLine[];
};

function mergeLotsIntoSummary(
  summary: ReadyDeductionSummaryLine[],
  lotDeductions: ReadyLotDeduction[],
  catalog: DeductionPacking[],
): void {
  for (const lot of lotDeductions) {
    const packing = catalog.find((p) => p.code.trim().toLowerCase() === lot.productCode);
    const productName = packing?.name ?? lot.productCode;
    let row = summary.find((s) => s.productCode === lot.productCode);
    if (!row) {
      row = { productCode: lot.productCode, productName, bottles: 0, lots: [] };
      summary.push(row);
    }
    if (!row.lots) row.lots = [];
    const existingLot = row.lots.find((l) => l.batchNo === lot.batchNo);
    if (existingLot) existingLot.bottles += lot.bottles;
    else row.lots.push({ batchNo: lot.batchNo, bottles: lot.bottles });
  }
}

async function deductFromStockPools(args: {
  productCode: string;
  productName: string;
  bottles: number;
  catalog: DeductionPacking[];
  orderId: string;
  poNumber: string;
  audit: { userId: string; userName: string };
  stockMap: Map<string, number>;
}): Promise<{ error: string | null; deducted: ReadyDeductionSummaryLine[] }> {
  let remaining = args.bottles;
  const deducted: ReadyDeductionSummaryLine[] = [];

  const codes = isFamilyStockCode(args.productCode)
    ? args.catalog
        .filter((p) => p.batchFamily?.trim().toLowerCase() === familyFromStockCode(args.productCode))
        .map((p) => p.code.trim().toLowerCase())
    : readyStockDeductionCodes(args.productCode);

  for (const code of codes) {
    while (remaining > 0) {
      const onHand = args.stockMap.get(code) ?? 0;
      if (onHand <= 0) break;
      const take = Math.min(remaining, onHand);
      const packing = args.catalog.find((p) => p.code.trim().toLowerCase() === code);
      const productName = packing?.name ?? code;
      const err = await applyReadyBottleDelta({
        productCode: code,
        productName,
        delta: -take,
        reason: "delivered",
        note: `PO ${args.poNumber} delivered`,
        orderId: args.orderId,
        poNumber: args.poNumber,
        audit: args.audit,
      });
      if (err) return { error: err, deducted: [] };
      args.stockMap.set(code, onHand - take);
      remaining -= take;
      const existing = deducted.find((d) => d.productCode === code);
      if (existing) existing.bottles += take;
      else deducted.push({ productCode: code, productName, bottles: take });
    }
    if (remaining <= 0) break;
  }

  if (remaining > 0) {
    const onHand = codes.reduce((sum, code) => sum + (args.stockMap.get(code) ?? 0), 0);
    return {
      error: `Insufficient ready stock for ${args.productName}: need ${args.bottles}, on hand ${onHand}`,
      deducted: [],
    };
  }

  return { error: null, deducted };
}

async function applyBatchLotDeductions(args: {
  lotDeductions: ReadyLotDeduction[];
  catalog: DeductionPacking[];
  poNumber: string;
  audit: { userId: string; userName: string };
}): Promise<string | null> {
  for (const lot of args.lotDeductions) {
    const packing = args.catalog.find((p) => p.code.trim().toLowerCase() === lot.productCode);
    const productName = packing?.name ?? lot.productCode;
    const err = await applyReadyBatchLotDelta({
      batchNo: lot.batchNo,
      productCode: lot.productCode,
      productName,
      delta: -lot.bottles,
      note: `PO ${args.poNumber} delivered`,
      audit: args.audit,
    });
    if (err) return err;
  }
  return null;
}

export async function deductReadyBottlesForDelivered(args: {
  orderId: string;
  poNumber: string;
  sheetLines: DeductionSheetLine[];
  catalog: DeductionPacking[];
  audit: { userId: string; userName: string };
}): Promise<{ error: string | null; summary: ReadyDeductionSummaryLine[] }> {
  const { missingProducts } = bottlesPerProductFromSheetLines(args.sheetLines, args.catalog);
  const blockingMissing = missingProducts.filter(
    (name) => !isDrumContainerProduct(name) && !isJarOnlyContainerLine(name),
  );
  if (blockingMissing.length > 0) {
    return {
      error: `Cannot deduct ready stock — unknown products: ${blockingMissing.join(", ")}`,
      summary: [],
    };
  }

  const [stockMap, batchLotDocs] = await Promise.all([getReadyStockMap(), listBatchLots()]);
  const batchLots: ReadyBatchLotInput[] = batchLotDocs.map((l) => ({
    batchNo: l.batchNo,
    productCode: l.productCode,
    bottles: l.bottles,
    createdAt: l.createdAt,
  }));

  const { productSummary, lotDeductions } = allocateReadyStockToLines(
    args.sheetLines,
    args.catalog,
    stockMap,
    batchLots,
  );

  const needs = productSummary
    .filter((s) => s.fromReady > 0)
    .map((s) => ({
      productCode: s.productCode,
      productName: s.productName,
      bottles: s.fromReady,
    }));

  if (needs.length === 0) return { error: null, summary: [] };

  const summary: ReadyDeductionSummaryLine[] = [];

  for (const line of needs) {
    const result = await deductFromStockPools({
      productCode: line.productCode,
      productName: line.productName,
      bottles: line.bottles,
      catalog: args.catalog,
      orderId: args.orderId,
      poNumber: args.poNumber,
      audit: args.audit,
      stockMap,
    });
    if (result.error) return { error: result.error, summary: [] };
    for (const row of result.deducted) {
      const existing = summary.find((d) => d.productCode === row.productCode);
      if (existing) existing.bottles += row.bottles;
      else summary.push({ ...row });
    }
  }

  const lotError = await applyBatchLotDeductions({
    lotDeductions,
    catalog: args.catalog,
    poNumber: args.poNumber,
    audit: args.audit,
  });
  if (lotError) return { error: lotError, summary: [] };

  mergeLotsIntoSummary(summary, lotDeductions, args.catalog);
  summary.sort((a, b) => a.productName.localeCompare(b.productName));
  return { error: null, summary };
}

export async function restoreReadyBottlesAfterReturn(args: {
  orderId: string;
  poNumber: string;
  summary: ReadyDeductionSummaryLine[];
  audit: { userId: string; userName: string };
}): Promise<string | null> {
  if (!args.summary.length) return null;

  for (const line of args.summary) {
    if (line.lots?.length) {
      for (const lot of line.lots) {
        const err = await applyReadyBatchLotDelta({
          batchNo: lot.batchNo,
          productCode: line.productCode,
          productName: line.productName,
          delta: lot.bottles,
          note: `PO ${args.poNumber} pending redelivery — batch lot restored`,
          audit: args.audit,
        });
        if (err) return err;
      }
    }

    const err = await applyReadyBottleDelta({
      productCode: line.productCode,
      productName: line.productName,
      delta: line.bottles,
      reason: "delivery_return",
      note: `PO ${args.poNumber} pending redelivery — ready stock restored`,
      orderId: args.orderId,
      poNumber: args.poNumber,
      audit: args.audit,
    });
    if (err) return err;
  }

  return null;
}

export function compareReadyStockToNeeds(
  needs: ReadyDeductionSummaryLine[],
  stockMap: Map<string, number>,
): { ok: boolean; shortfalls: Array<{ productName: string; need: number; onHand: number; short: number }> } {
  const shortfalls: Array<{ productName: string; need: number; onHand: number; short: number }> = [];
  for (const n of needs) {
    const onHand = stockMap.get(n.productCode) ?? 0;
    if (onHand < n.bottles) {
      shortfalls.push({
        productName: n.productName,
        need: n.bottles,
        onHand,
        short: n.bottles - onHand,
      });
    }
  }
  return { ok: shortfalls.length === 0, shortfalls };
}

function findSummaryRow(
  productCode: string,
  summary: ReadyDeductionSummaryLine[],
): ReadyDeductionSummaryLine | undefined {
  const code = productCode.trim().toLowerCase();
  return summary.find((s) => s.productCode.trim().toLowerCase() === code);
}

async function restoreBottlesForProduct(args: {
  productCode: string;
  productName: string;
  bottles: number;
  summaryRow: ReadyDeductionSummaryLine | undefined;
  orderId: string;
  poNumber: string;
  note: string;
  audit: { userId: string; userName: string };
  allowExceedDeducted?: boolean;
}): Promise<string | null> {
  if (args.bottles <= 0) return null;

  if (
    !args.allowExceedDeducted &&
    args.summaryRow &&
    args.bottles > args.summaryRow.bottles
  ) {
    return `Cannot restore ${args.bottles} bottles for ${args.productName} — only ${args.summaryRow.bottles} were deducted on this PO.`;
  }

  let remaining = args.bottles;
  const lots = args.summaryRow?.lots ?? [];

  if (lots.length > 0 && args.summaryRow) {
    const totalInLots = lots.reduce((s, l) => s + l.bottles, 0);
    for (const lot of lots) {
      if (remaining <= 0) break;
      const share =
        totalInLots > 0
          ? Math.min(remaining, Math.round((args.bottles * lot.bottles) / totalInLots))
          : 0;
      const take = Math.min(share, lot.bottles, remaining);
      if (take <= 0) continue;
      const err = await applyReadyBatchLotDelta({
        batchNo: lot.batchNo,
        productCode: args.productCode,
        productName: args.productName,
        delta: take,
        note: args.note,
        audit: args.audit,
      });
      if (err) return err;
      remaining -= take;
    }
  }

  if (remaining > 0) {
    const err = await applyReadyBottleDelta({
      productCode: args.productCode,
      productName: args.productName,
      delta: remaining,
      reason: "delivery_return",
      note: args.note,
      orderId: args.orderId,
      poNumber: args.poNumber,
      audit: args.audit,
    });
    if (err) return err;
  }

  return null;
}

/** After full dispatch deduct, restore good-returned bottles from a partial close. */
export async function restoreGoodReturnsAfterPartialDelivery(args: {
  orderId: string;
  poNumber: string;
  closureLines: DeliveryClosureLine[];
  deductionSummary: ReadyDeductionSummaryLine[];
  audit: { userId: string; userName: string };
}): Promise<string | null> {
  for (const line of args.closureLines) {
    if (line.returnedBottles <= 0) continue;
    const summaryRow = findSummaryRow(line.productCode, args.deductionSummary);
    const err = await restoreBottlesForProduct({
      productCode: line.productCode,
      productName: line.productName,
      bottles: line.returnedBottles,
      summaryRow,
      orderId: args.orderId,
      poNumber: args.poNumber,
      note: `PO ${args.poNumber} partial close — ${line.returnedBottles} good returned to Rashid stock`,
      audit: args.audit,
      allowExceedDeducted: true,
    });
    if (err) return err;
  }
  return null;
}

export async function applyDeliveryClosureStock(args: {
  orderId: string;
  poNumber: string;
  outcome: "full" | "partial";
  closureLines: DeliveryClosureLine[];
  deductionSummary: ReadyDeductionSummaryLine[];
  audit: { userId: string; userName: string };
}): Promise<string | null> {
  if (args.outcome === "full") return null;
  const hasReturns = args.closureLines.some((l) => l.returnedBottles > 0);
  if (!hasReturns) return null;
  return restoreGoodReturnsAfterPartialDelivery({
    orderId: args.orderId,
    poNumber: args.poNumber,
    closureLines: args.closureLines,
    deductionSummary: args.deductionSummary,
    audit: args.audit,
  });
}

/** Late returns from past deliveries — no cap vs original dispatched qty; good bottles re-enter Rashid stock. */
export async function applyLateReturnStock(args: {
  orderId: string;
  poNumber: string;
  lines: LateReturnLine[];
  note: string;
  audit: { userId: string; userName: string };
}): Promise<string | null> {
  const noteSuffix = args.note ? ` — ${args.note}` : "";
  for (const line of args.lines) {
    if (line.returnedBottles > 0) {
      const err = await applyReadyBottleDelta({
        productCode: line.productCode,
        productName: line.productName,
        delta: line.returnedBottles,
        reason: "delivery_return",
        note: `PO ${args.poNumber} late return — ${line.returnedBottles} good${noteSuffix}`,
        orderId: args.orderId,
        poNumber: args.poNumber,
        audit: args.audit,
      });
      if (err) return err;
    }
    // damagedBottles: recorded on order only; no stock credit (write-off)
  }
  return null;
}
