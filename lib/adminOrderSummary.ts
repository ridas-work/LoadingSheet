export type SummaryColumn = {
  key: string;
  label: string;
};

export type SummaryRow = {
  sr: number;
  customerName: string;
  city: string;
  deadlineDisplay: string;
  builtyDone: boolean;
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
  poNumber: string;
  customerName: string;
  city?: string | null;
  deadlineDate?: Date | string | null;
  dispatchTripId?: unknown;
  dispatch?: { vehicleNo?: string | null } | null;
  items?: Array<{ productName?: string; boxes?: number }>;
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
  const filtered = options?.pendingOnly ? orders.filter((o) => !isBuiltyDone(o)) : orders;

  const rows: SummaryRow[] = filtered.map((order, idx) => {
    const cells: Record<string, number> = Object.fromEntries(columns.map((c) => [c.key, 0]));

    for (const item of order.items ?? []) {
      const boxes = typeof item.boxes === "number" ? item.boxes : 0;
      if (boxes < 1) continue;
      const code = resolveCatalogCode(item.productName ?? "", catalog);
      if (!code || !(code in cells)) continue;
      cells[code] += boxes;
    }

    const rowTotal = Object.values(cells).reduce((sum, n) => sum + n, 0);
    const builtyDone = isBuiltyDone(order);

    return {
      sr: idx + 1,
      customerName: order.customerName,
      city: order.city?.trim() ?? "",
      deadlineDisplay: builtyDone ? "BUILTY DONE" : formatDeadline(order.deadlineDate ?? null),
      builtyDone,
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
