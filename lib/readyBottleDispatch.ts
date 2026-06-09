import { bottlesPerProductFromSheetLines } from "@/lib/bottlesFromSheetLines";
import type { DeductionPacking, DeductionSheetLine } from "@/lib/packagingDeduction";
import { applyReadyBottleDelta } from "@/lib/readyBottleLedger";

export type ReadyDeductionSummaryLine = {
  productCode: string;
  productName: string;
  bottles: number;
};

export async function deductReadyBottlesForDelivered(args: {
  orderId: string;
  poNumber: string;
  sheetLines: DeductionSheetLine[];
  catalog: DeductionPacking[];
  audit: { userId: string; userName: string };
}): Promise<{ error: string | null; summary: ReadyDeductionSummaryLine[] }> {
  const { needs, missingProducts } = bottlesPerProductFromSheetLines(args.sheetLines, args.catalog);
  if (missingProducts.length > 0) {
    return {
      error: `Cannot deduct ready stock — unknown products: ${missingProducts.join(", ")}`,
      summary: [],
    };
  }
  if (needs.length === 0) return { error: null, summary: [] };

  const summary: ReadyDeductionSummaryLine[] = needs.map((n) => ({
    productCode: n.productCode,
    productName: n.productName,
    bottles: n.bottles,
  }));

  for (const line of summary) {
    const err = await applyReadyBottleDelta({
      productCode: line.productCode,
      productName: line.productName,
      delta: -line.bottles,
      reason: "delivered",
      note: `PO ${args.poNumber} delivered`,
      orderId: args.orderId,
      poNumber: args.poNumber,
      audit: args.audit,
    });
    if (err) return { error: err, summary: [] };
  }

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
