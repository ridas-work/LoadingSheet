import { GATE_STATUS_LABELS, normalizeGateStatus } from "@/lib/gateDelivery";
import { SUBTRACTED_STATUS_LABELS, type SubtractedItemRecord } from "@/lib/subtractedItems";

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
  counts: {
    delivered: number;
    pending: number;
    closed: number;
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
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
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
): AdminDeliverySummary {
  const delivered: SummaryLineRow[] = [];
  const pending: SummaryLineRow[] = [];
  const closed: SummaryLineRow[] = [];

  for (const order of orders) {
    const gate = normalizeGateStatus(order.gateDeliveryStatus);
    const oid = order._id.toString();
    const onLoadSummary = orderProductsSummary(order);

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
    reportDate: `${rd.getDate()}/${rd.getMonth() + 1}/${rd.getFullYear()}`,
    delivered,
    pending,
    closed,
    counts: {
      delivered: delivered.length,
      pending: pending.length,
      closed: closed.length,
    },
  };
}
