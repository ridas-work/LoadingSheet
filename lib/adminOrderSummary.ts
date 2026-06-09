export type SummaryColumn = {
  key: string;
  label: string;
};

export type SummaryRow = {
  sr: number;
  orderId: string;
  customerName: string;
  city: string;
  deadlineDisplay: string;
  builtyDone: boolean;
  gateDeliveryStatus: string;
  statusLabel: string;
  poNumber: string;
  cells: Record<string, number>;
  rowTotal: number;
};

export type AdminOrderSummary = {
  reportDate: string;
  columns: SummaryColumn[];
  rows: SummaryRow[];
  columnTotals: Record<string, number>;
  grandTotal: number;
};

type CatalogRow = {
  code: string;
  name: string;
  aliases?: string[];
  summaryLabel?: string;
};

type OrderInput = {
  orderId: string;
  poNumber: string;
  customerName: string;
  city?: string | null;
  deadlineDate?: Date | string | null;
  gateDeliveryStatus?: string | null;
  dispatchTripId?: unknown;
  dispatch?: { vehicleNo?: string | null } | null;
  orderKind?: string | null;
  mixedSample?: {
    boxCount?: number;
    contents?: Array<{ productName?: string; bottles?: number }>;
  } | null;
  items?: Array<{ productName?: string; boxes?: number }>;
  customCartons?: Array<{
    boxCount?: number;
    contents?: Array<{ productName?: string; bottles?: number }>;
  }>;
};

function resolveCatalogCode(productName: string, catalog: CatalogRow[]): string | null {
  const key = productName.trim().toLowerCase();
  if (!key) return null;

  for (const p of catalog) {
    if (p.name.trim().toLowerCase() === key) return p.code;
    for (const alias of p.aliases ?? []) {
      if (alias.trim().toLowerCase() === key) return p.code;
    }
  }

  return null;
}

function columnLabel(p: CatalogRow): string {
  const label = p.summaryLabel?.trim();
  if (label) return label;
  const name = p.name.trim();
  return name.length > 24 ? `${name.slice(0, 22)}…` : name;
}

function formatDeadline(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function isBuiltyDone(order: OrderInput): boolean {
  const tripId = order.dispatchTripId;
  const hasTrip = tripId != null && String(tripId).length > 0;
  const vehicle = order.dispatch?.vehicleNo?.trim() ?? "";
  return hasTrip && vehicle.length > 0;
}

function normalizeSummaryGateStatus(raw: string | null | undefined): string {
  const s = (raw ?? "none").trim().toLowerCase();
  if (s === "out_for_delivery" || s === "delivered" || s === "pending_redelivery") return s;
  return "none";
}

const SUMMARY_STATUS_LABELS: Record<string, string> = {
  none: "At factory",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  pending_redelivery: "Pending redelivery",
};

function summaryStatusLabel(gateStatus: string, builtyDone: boolean): string {
  if (gateStatus === "delivered") return SUMMARY_STATUS_LABELS.delivered;
  if (gateStatus === "out_for_delivery") return SUMMARY_STATUS_LABELS.out_for_delivery;
  if (gateStatus === "pending_redelivery") return SUMMARY_STATUS_LABELS.pending_redelivery;
  if (builtyDone) return "Builty done";
  return SUMMARY_STATUS_LABELS.none;
}

function summaryDeadlineDisplay(
  order: OrderInput,
  gateStatus: string,
  builtyDone: boolean,
): string {
  if (gateStatus === "delivered") return "DELIVERED";
  if (gateStatus === "out_for_delivery") return "OUT FOR DELIVERY";
  if (gateStatus === "pending_redelivery") return "PENDING REDELIVERY";
  if (builtyDone) return "BUILTY DONE";
  return formatDeadline(order.deadlineDate ?? null);
}

function isAdminActiveOrder(order: OrderInput): boolean {
  const gate = normalizeSummaryGateStatus(order.gateDeliveryStatus);
  return gate !== "delivered";
}

export function buildAdminOrderSummary(
  orders: OrderInput[],
  catalog: CatalogRow[],
  options?: { pendingOnly?: boolean; reportDate?: Date },
): AdminOrderSummary {
  const columns: SummaryColumn[] = catalog.map((p) => ({
    key: p.code,
    label: columnLabel(p),
  }));

  const columnTotals: Record<string, number> = Object.fromEntries(columns.map((c) => [c.key, 0]));
  const filtered = options?.pendingOnly ? orders.filter((o) => isAdminActiveOrder(o)) : orders;

  const rows: SummaryRow[] = filtered.map((order, idx) => {
    const cells: Record<string, number> = Object.fromEntries(columns.map((c) => [c.key, 0]));

    if (order.orderKind === "mixed_sample" && order.mixedSample?.contents?.length) {
      const boxCount =
        typeof order.mixedSample.boxCount === "number" && order.mixedSample.boxCount >= 1
          ? order.mixedSample.boxCount
          : 1;
      for (const item of order.mixedSample.contents) {
        const bottles = typeof item.bottles === "number" ? item.bottles : 0;
        if (bottles < 1) continue;
        const code = resolveCatalogCode(item.productName ?? "", catalog);
        if (!code || !(code in cells)) continue;
        cells[code] += bottles * boxCount;
      }
    } else {
      for (const item of order.items ?? []) {
        const boxes = typeof item.boxes === "number" ? item.boxes : 0;
        if (boxes < 1) continue;
        const code = resolveCatalogCode(item.productName ?? "", catalog);
        if (!code || !(code in cells)) continue;
        cells[code] += boxes;
      }
      for (const carton of order.customCartons ?? []) {
        const boxCount =
          typeof carton.boxCount === "number" && carton.boxCount >= 1 ? carton.boxCount : 1;
        for (const item of carton.contents ?? []) {
          const bottles = typeof item.bottles === "number" ? item.bottles : 0;
          if (bottles < 1) continue;
          const code = resolveCatalogCode(item.productName ?? "", catalog);
          if (!code || !(code in cells)) continue;
          cells[code] += bottles * boxCount;
        }
      }
    }

    const rowTotal = Object.values(cells).reduce((sum, n) => sum + n, 0);
    const builtyDone = isBuiltyDone(order);
    const gateDeliveryStatus = normalizeSummaryGateStatus(order.gateDeliveryStatus);

    return {
      sr: idx + 1,
      orderId: order.orderId,
      customerName: order.customerName,
      city: order.city?.trim() ?? "",
      deadlineDisplay: summaryDeadlineDisplay(order, gateDeliveryStatus, builtyDone),
      builtyDone,
      gateDeliveryStatus,
      statusLabel: summaryStatusLabel(gateDeliveryStatus, builtyDone),
      poNumber: order.poNumber,
      cells,
      rowTotal,
    };
  });

  let grandTotal = 0;
  for (const row of rows) {
    grandTotal += row.rowTotal;
    for (const col of columns) {
      columnTotals[col.key] += row.cells[col.key] ?? 0;
    }
  }

  const reportDate = options?.reportDate ?? new Date();
  const rd = reportDate;
  const reportDateStr = `${rd.getDate()}/${rd.getMonth() + 1}/${rd.getFullYear()}`;

  return {
    reportDate: reportDateStr,
    columns,
    rows,
    columnTotals,
    grandTotal,
  };
}
