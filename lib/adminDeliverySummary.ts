import { GATE_STATUS_LABELS, normalizeGateStatus } from "@/lib/gateDelivery";
import { formatDisplayDate } from "@/lib/dateOnly";
import { normalizeClosureForDisplay } from "@/lib/gateDeliveryClosure";
import type { DeductionPacking, DeductionSheetLine } from "@/lib/packagingDeduction";
import { SUBTRACTED_STATUS_LABELS, type SubtractedItemRecord } from "@/lib/subtractedItems";

export type DeliveryClosureRow = {
  id: string;
  orderId: string;
  poNumber: string;
  customerName: string;
  productName: string;
  deliveredBottles: number;
  damagedBottles: number;
  returnedBottles: number;
  deliveryOutcome: string;
  closedAtLabel: string;
};

export type SummaryLineRow = {
  id: string;
  orderId: string;
  poNumber: string;
  customerName: string;
  productName: string;
  qtyLabel: string;
  detail: string;
  dateLabel: string;
  subtractionId?: string;
};

export type AdminDeliverySummary = {
  reportDate: string;
  delivered: SummaryLineRow[];
  pending: SummaryLineRow[];
  closed: SummaryLineRow[];
  closureRows: DeliveryClosureRow[];
  counts: {
    delivered: number;
    pending: number;
    closed: number;
    closureRows: number;
  };
};

type OrderInput = {
  _id: { toString(): string };
  poNumber: string;
  customerName: string;
  gateDeliveryStatus?: string | null;
  gateDeliveredAt?: Date | string | null;
  discardedAt?: Date | string | null;
  items?: Array<{ productName?: string; boxes?: number; bottlesPerBox?: number }>;
  subtractedItems?: SubtractedItemRecord[];
  sheetLines?: DeductionSheetLine[];
  deliveryOutcome?: string | null;
  orderClosedAt?: Date | string | null;
  deliveryClosureLines?: Array<{
    productName?: string;
    deliveredBottles?: number;
    damagedBottles?: number;
    returnedBottles?: number;
  }>;
  deliveryLateReturns?: Array<{
    lines?: Array<{ productName?: string; damagedBottles?: number; returnedBottles?: number }>;
  }>;
};

type BuildSummaryOpts = {
  catalog?: DeductionPacking[];
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const formatted = formatDisplayDate(value);
  return formatted || "—";
}

function qtyLabelForItem(item: SubtractedItemRecord): string {
  if (item.bottlesPerBox === 1) {
    return `${item.boxes} bottle${item.boxes !== 1 ? "s" : ""}`;
  }
  return `${item.boxes} ct × ${item.bottlesPerBox}`;
}

function orderProductsSummary(order: OrderInput): string {
  const parts: string[] = [];
  for (const it of order.items ?? []) {
    const boxes = typeof it.boxes === "number" ? it.boxes : 0;
    if (boxes < 1 || !it.productName?.trim()) continue;
    parts.push(`${it.productName.trim()} (${boxes})`);
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}

function subtractionRow(
  order: OrderInput,
  item: SubtractedItemRecord,
  bucket: "delivered" | "pending" | "closed",
): SummaryLineRow {
  const subtractionId = item._id != null ? String(item._id) : "";
  const date =
    bucket === "closed"
      ? item.discardedAt
      : bucket === "delivered"
        ? item.carriedOutAt ?? item.subtractedAt
        : item.subtractedAt;

  return {
    id: `sub-${order._id.toString()}-${subtractionId}`,
    orderId: order._id.toString(),
    poNumber: order.poNumber,
    customerName: order.customerName,
    productName: item.productName,
    qtyLabel: qtyLabelForItem(item),
    detail: SUBTRACTED_STATUS_LABELS[item.status],
    dateLabel: formatDate(date),
    subtractionId: subtractionId || undefined,
  };
}

export function buildAdminDeliverySummary(
  orders: OrderInput[],
  reportDate = new Date(),
  opts: BuildSummaryOpts = {},
): AdminDeliverySummary {
  const delivered: SummaryLineRow[] = [];
  const pending: SummaryLineRow[] = [];
  const closed: SummaryLineRow[] = [];
  const closureRows: DeliveryClosureRow[] = [];
  const catalog = opts.catalog ?? [];

  for (const order of orders) {
    const gate = normalizeGateStatus(order.gateDeliveryStatus);
    const oid = order._id.toString();
    const onLoadSummary = orderProductsSummary(order);

    if (gate === "delivered" && catalog.length > 0) {
      const display = normalizeClosureForDisplay(
        {
          deliveryOutcome: order.deliveryOutcome,
          orderClosedAt: order.orderClosedAt,
          deliveryClosureLines: order.deliveryClosureLines,
          deliveryLateReturns: order.deliveryLateReturns,
          sheetLines: order.sheetLines,
        },
        catalog,
      );
      const closedLabel = formatDate(order.orderClosedAt ?? order.gateDeliveredAt);
      for (const line of display.lines) {
        const lateDamaged = display.lateReturns.reduce(
          (s, ev) =>
            s +
            (ev.lines.find((l) => l.productName === line.productName)?.damagedBottles ?? 0),
          0,
        );
        const lateReturned = display.lateReturns.reduce(
          (s, ev) =>
            s +
            (ev.lines.find((l) => l.productName === line.productName)?.returnedBottles ?? 0),
          0,
        );
        closureRows.push({
          id: `closure-${oid}-${line.productCode}`,
          orderId: oid,
          poNumber: order.poNumber,
          customerName: order.customerName,
          productName: line.productName,
          deliveredBottles: line.deliveredBottles,
          damagedBottles: line.damagedBottles + lateDamaged,
          returnedBottles: line.returnedBottles + lateReturned,
          deliveryOutcome: display.outcome,
          closedAtLabel: closedLabel,
        });
      }
      for (const ev of display.lateReturns) {
        for (const l of ev.lines) {
          if (display.lines.some((x) => x.productName === l.productName)) continue;
          closureRows.push({
            id: `late-${oid}-${l.productCode}-${ev.recordedAt}`,
            orderId: oid,
            poNumber: order.poNumber,
            customerName: order.customerName,
            productName: l.productName,
            deliveredBottles: 0,
            damagedBottles: l.damagedBottles,
            returnedBottles: l.returnedBottles,
            deliveryOutcome: "late_return",
            closedAtLabel: formatDate(ev.recordedAt),
          });
        }
      }
    }

    if (order.discardedAt) {
      closed.push({
        id: `order-discarded-${oid}`,
        orderId: oid,
        poNumber: order.poNumber,
        customerName: order.customerName,
        productName: "Full PO",
        qtyLabel: onLoadSummary,
        detail: "PO discarded",
        dateLabel: formatDate(order.discardedAt),
      });
      continue;
    }

    if (gate === "delivered") {
      delivered.push({
        id: `order-${oid}`,
        orderId: oid,
        poNumber: order.poNumber,
        customerName: order.customerName,
        productName: "Full PO",
        qtyLabel: onLoadSummary,
        detail: GATE_STATUS_LABELS.delivered,
        dateLabel: formatDate(order.gateDeliveredAt),
      });
    } else {
      pending.push({
        id: `order-${oid}`,
        orderId: oid,
        poNumber: order.poNumber,
        customerName: order.customerName,
        productName: "Current PO",
        qtyLabel: onLoadSummary,
        detail: GATE_STATUS_LABELS[gate],
        dateLabel: "—",
      });
    }

    for (const raw of order.subtractedItems ?? []) {
      const item = raw as SubtractedItemRecord & { _id?: { toString(): string } | string };
      if (item.status === "discarded") {
        closed.push(subtractionRow(order, item, "closed"));
      } else if (item.status === "carried_out") {
        delivered.push(subtractionRow(order, item, "delivered"));
      } else if (item.status === "pending") {
        pending.push(subtractionRow(order, item, "pending"));
      }
    }
  }

  const rd = reportDate;
  return {
    reportDate: formatDisplayDate(rd),
    delivered,
    pending,
    closed,
    closureRows,
    counts: {
      delivered: delivered.length,
      pending: pending.length,
      closed: closed.length,
      closureRows: closureRows.length,
    },
  };
}
