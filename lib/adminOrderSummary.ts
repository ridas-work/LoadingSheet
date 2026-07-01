import { resolveCatalogCode, type ReportCatalogRow } from "@/lib/adminOperationsReports";
import { GATE_STATUS_LABELS, normalizeGateStatus } from "@/lib/gateDelivery";
import { buildOrderPoDetail, type OrderPoDetail } from "@/lib/orderPoDetail";
import {
  APPROVAL_STATUS_LABELS,
  normalizeApprovalStatus,
  type ApprovalStatus,
} from "@/lib/orderApproval";

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
  detail: OrderPoDetail;
};

export type AdminOrderSummary = {
  reportDate: string;
  columns: SummaryColumn[];
  rows: SummaryRow[];
  columnTotals: Record<string, number>;
  grandTotal: number;
  pendingApprovalCount: number;
};

export type SummaryCatalogRow = ReportCatalogRow & {
  summaryLabel?: string;
};

export type SummaryOrderInput = {
  _id: { toString(): string };
  poNumber: string;
  customerName: string;
  city?: string | null;
  deadlineDate?: Date | string | null;
  orderKind?: string | null;
  items?: Array<{ productName?: string; boxes?: number; bottlesPerBox?: number }>;
  mixedSample?: {
    boxCount?: number;
    contents?: Array<{ productName?: string; bottles?: number; bottleSizeCode?: string }>;
  } | null;
  customCartons?: Array<{
    boxCount?: number;
    label?: string;
    customBoxCode?: string;
    contents?: Array<{ productName?: string; bottles?: number; bottleSizeCode?: string }>;
  }>;
  subtractedItems?: Parameters<typeof buildOrderPoDetail>[0]["subtractedItems"];
  dispatchTripId?: unknown;
  dispatch?: { vehicleNo?: string | null };
  gateDeliveryStatus?: string | null;
  approvalStatus?: string | null;
  discardedAt?: Date | string | null;
};

function columnLabel(p: SummaryCatalogRow): string {
  return p.summaryLabel?.trim() || p.name;
}

function formatDeadline(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function isBuiltyDone(order: SummaryOrderInput): boolean {
  const vehicle = order.dispatch?.vehicleNo?.trim() ?? "";
  return Boolean(order.dispatchTripId && vehicle);
}

function statusLabelFor(order: SummaryOrderInput): string {
  const approval = normalizeApprovalStatus(order.approvalStatus) as ApprovalStatus;
  if (approval === "pending") return APPROVAL_STATUS_LABELS.pending;
  if (approval === "rejected") return APPROVAL_STATUS_LABELS.rejected;
  const gate = normalizeGateStatus(order.gateDeliveryStatus);
  return GATE_STATUS_LABELS[gate];
}

function addCell(cells: Record<string, number>, code: string, qty: number) {
  if (!code || qty <= 0) return;
  cells[code] = (cells[code] ?? 0) + qty;
}

function accumulateOrderCells(
  order: SummaryOrderInput,
  catalog: SummaryCatalogRow[],
): Record<string, number> {
  const cells: Record<string, number> = {};
  const kind = order.orderKind ?? "standard";

  if (kind === "mixed_sample" && order.mixedSample?.contents?.length) {
    const boxes = Math.max(0, Number(order.mixedSample.boxCount) || 0);
    for (const c of order.mixedSample.contents) {
      const name = c.productName?.trim() ?? "";
      const bottles = Number(c.bottles) || 0;
      if (!name || bottles <= 0) continue;
      const code = resolveCatalogCode(name, catalog);
      if (code) addCell(cells, code, bottles * boxes);
    }
    return cells;
  }

  for (const item of order.items ?? []) {
    const name = item.productName?.trim() ?? "";
    const boxes = Number(item.boxes) || 0;
    if (!name || boxes <= 0) continue;
    const code = resolveCatalogCode(name, catalog);
    if (code) addCell(cells, code, boxes);
  }

  for (const carton of order.customCartons ?? []) {
    const boxes = Math.max(0, Number(carton.boxCount) || 0);
    for (const c of carton.contents ?? []) {
      const name = c.productName?.trim() ?? "";
      const bottles = Number(c.bottles) || 0;
      if (!name || bottles <= 0) continue;
      const code = resolveCatalogCode(name, catalog);
      if (code) addCell(cells, code, bottles * boxes);
    }
  }

  return cells;
}

function rowTotal(cells: Record<string, number>): number {
  return Object.values(cells).reduce((sum, n) => sum + n, 0);
}

export function buildAdminOrderSummary(
  orders: SummaryOrderInput[],
  catalog: SummaryCatalogRow[],
  options?: { pendingOnly?: boolean },
): AdminOrderSummary {
  const pendingOnly = options?.pendingOnly !== false;
  const columns: SummaryColumn[] = catalog
    .map((p) => ({ key: p.code, label: columnLabel(p) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const columnTotals: Record<string, number> = {};
  for (const col of columns) columnTotals[col.key] = 0;

  let pendingApprovalCount = 0;
  const rows: SummaryRow[] = [];
  let sr = 0;

  for (const order of orders) {
    if (order.discardedAt) continue;
    if (normalizeApprovalStatus(order.approvalStatus) === "pending") {
      pendingApprovalCount += 1;
    }

    const gate = normalizeGateStatus(order.gateDeliveryStatus);
    if (pendingOnly && gate === "delivered") continue;

    const cells = accumulateOrderCells(order, catalog);
    const total = rowTotal(cells);
    const builtyDone = isBuiltyDone(order);

    for (const [code, qty] of Object.entries(cells)) {
      columnTotals[code] = (columnTotals[code] ?? 0) + qty;
    }

    sr += 1;
    rows.push({
      sr,
      orderId: order._id.toString(),
      customerName: order.customerName,
      city: order.city?.trim() ?? "",
      deadlineDisplay: builtyDone ? "BUILTY DONE" : formatDeadline(order.deadlineDate),
      builtyDone,
      gateDeliveryStatus: gate,
      statusLabel: statusLabelFor(order),
      poNumber: order.poNumber,
      cells,
      rowTotal: total,
      detail: buildOrderPoDetail({
        orderKind: order.orderKind,
        items: order.items,
        mixedSample: order.mixedSample,
        customCartons: order.customCartons,
        subtractedItems: order.subtractedItems,
      }),
    });
  }

  const grandTotal = Object.values(columnTotals).reduce((sum, n) => sum + n, 0);
  const now = new Date();

  return {
    reportDate: now.toLocaleDateString(),
    columns,
    rows,
    columnTotals,
    grandTotal,
    pendingApprovalCount,
  };
}
