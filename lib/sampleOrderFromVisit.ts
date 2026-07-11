import { buildSheetLines, type OrderItemInput, type SheetLine } from "@/lib/buildSheetLines";
import { FIELD_SAMPLE_ORDER_KIND } from "@/lib/sampleDispatch";

type SampleProductInput = {
  productName?: string | null;
  bottles?: number | null;
};

export type SampleVisitTicketInput = {
  _id: { toString(): string };
  customerName?: string | null;
  placeName?: string | null;
  city?: string | null;
  createdByName?: string | null;
  sampleProducts?: SampleProductInput[] | null;
};

export type SampleOrderPayload = {
  poNumber: string;
  customerName: string;
  city: string;
  orderKind: typeof FIELD_SAMPLE_ORDER_KIND;
  fieldVisitTicketId: string;
  sampleRepName: string;
  items: OrderItemInput[];
  sheetLines: SheetLine[];
};

/** Synthetic PO number for a sample dispatch — SAMPLE-<last 6 of ticket id>. */
export function sampleOrderPoNumber(ticketId: string): string {
  const tail = ticketId.slice(-6).toUpperCase();
  return `SAMPLE-${tail}`;
}

/**
 * Build the dispatch order for an approved outgoing sample request.
 * One carton row per requested product; bottles for that product = bottlesPerBox.
 * Batch numbers stay empty until Rashid assigns sample production batches.
 */
export function buildSampleOrderFromVisit(ticket: SampleVisitTicketInput): SampleOrderPayload {
  const ticketId = ticket._id.toString();

  const items: OrderItemInput[] = (ticket.sampleProducts ?? [])
    .map((p) => ({
      productName: (p.productName ?? "").trim(),
      boxes: 1,
      bottlesPerBox: typeof p.bottles === "number" && p.bottles >= 1 ? p.bottles : 1,
    }))
    .filter((item) => item.productName.length > 0);

  const sheetLines = buildSheetLines(items);

  const customerName =
    (ticket.customerName ?? "").trim() || (ticket.placeName ?? "").trim() || "Sample recipient";

  return {
    poNumber: sampleOrderPoNumber(ticketId),
    customerName,
    city: (ticket.city ?? "").trim(),
    orderKind: FIELD_SAMPLE_ORDER_KIND,
    fieldVisitTicketId: ticketId,
    sampleRepName: (ticket.createdByName ?? "").trim(),
    items,
    sheetLines,
  };
}

/** Aggregate sample order sheet lines into product bottle totals for pool deduction. */
export function sampleDeductionLinesFromSheet(
  sheetLines: Array<{ productName: string; bottlesPerBox: number }>,
): Array<{ productName: string; bottles: number }> {
  const byProduct = new Map<string, number>();
  for (const line of sheetLines) {
    const name = line.productName.trim();
    if (!name) continue;
    byProduct.set(name, (byProduct.get(name) ?? 0) + line.bottlesPerBox);
  }
  return [...byProduct.entries()].map(([productName, bottles]) => ({ productName, bottles }));
}
