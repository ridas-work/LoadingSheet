/**
 * Waleed operations reports — aggregates bottles/cartons from loading sheet lines
 * (actual load). Falls back to PO items when an order has no sheet lines yet.
 */

import type {
  BatchBottleLineRow,
  BatchBottlesReport,
  BatchDestinationRow,
  CustomerProductSummaryRow,
  CustomerOrderRow,
  CustomerOrdersReport,
  DispersionReport,
  DispersionRow,
  GrandTotals,
  OverviewReport,
  ProductTotalRow,
  ProductTotalsReport,
  ReportOptions,
  ReportScope,
} from "@/lib/adminOperationsReports.types";
import { inferLitersPerBottleFromName, normalizeBatchNo } from "@/lib/batchVolume";
import { findPackingByName, lineBatchAllocations } from "@/lib/bundleCatalog";
import type { PackingCatalogRow } from "@/lib/bundleCatalog";
import { mergeStandardAndCustomSheetLines } from "@/lib/hybridSheetLines";
import { isMixedSampleLine } from "@/lib/mixedSampleBox";
import {
  summarizePackagingConsumption,
  type DeductionPacking,
  type DeductionSheetLine,
} from "@/lib/packagingDeduction";

export type {
  BatchBottleLineRow,
  BatchBottlesReport,
  BatchDestinationRow,
  CustomerProductSummaryRow,
  CustomerOrdersReport,
  DispersionReport,
  GrandTotals,
  OverviewReport,
  ProductTotalRow,
  ProductTotalsReport,
  ReportOptions,
  ReportScope,
} from "@/lib/adminOperationsReports.types";

export type ReportCatalogRow = {
  code: string;
  name: string;
  aliases?: string[];
  summaryLabel?: string;
  litersPerBottle?: number;
  bottlesPerCarton?: number;
  batchFamily?: string;
};

export type ReportOrderInput = {
  orderId: string;
  poNumber: string;
  customerName: string;
  createdAt?: Date | string | null;
  gateDeliveryStatus?: string | null;
  gateDeliveredAt?: Date | string | null;
  dispatchTripId?: unknown;
  dispatch?: { vehicleNo?: string | null; dcNo?: string | null } | null;
  discardedAt?: Date | string | null;
  orderKind?: string | null;
  items?: Array<{ productName?: string; boxes?: number; bottlesPerBox?: number }>;
  sheetLines?: Array<{
    boxNo?: number;
    productName: string;
    bottlesPerBox: number;
    lineKind?: string | null;
    mixedContents?: Array<{ productName: string; bottles: number }> | null;
    customBoxCode?: string | null;
    batchNo?: string | null;
    componentBatches?: Array<{ productName: string; batchNo?: string | null }> | null;
  }>;
  mixedSample?: {
    boxCount?: number;
    contents?: Array<{ productName?: string; bottles?: number }>;
  } | null;
  customCartons?: Array<{
    boxCount?: number;
    label?: string;
    customBoxCode?: string;
    contents?: Array<{ productName?: string; bottles?: number }>;
  }>;
};

export type ReportBatchInput = {
  batchId: string;
  batchNo: string;
  productName: string;
  totalLiters: number;
};

export type ReportFillingEntry = {
  batchNo: string;
  entryDate: string;
  packingLines: Array<{
    productCode: string;
    productName: string;
    filledBottlesToday: number;
  }>;
};

function key(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeGateStatus(raw: string | null | undefined): string {
  const s = (raw ?? "none").trim().toLowerCase();
  if (s === "delivered" || s === "out_for_delivery" || s === "pending_redelivery") return s;
  return "none";
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function catalogDeduction(catalog: ReportCatalogRow[]): DeductionPacking[] {
  return catalog.map((p) => ({
    code: p.code,
    name: p.name,
    bottlesPerCarton: p.bottlesPerCarton ?? 1,
    aliases: p.aliases,
  }));
}

function packingCatalogRows(catalog: ReportCatalogRow[]): PackingCatalogRow[] {
  return catalog.map((p) => ({
    code: p.code,
    name: p.name,
    bottlesPerCarton: p.bottlesPerCarton ?? 1,
    litersPerBottle: p.litersPerBottle ?? 1,
    aliases: p.aliases ?? [],
    batchFamily: p.batchFamily?.trim() || p.name,
  }));
}

export function resolveCatalogCode(productName: string, catalog: ReportCatalogRow[]): string | null {
  const k = key(productName);
  if (!k) return null;
  for (const p of catalog) {
    if (key(p.name) === k) return p.code;
    for (const alias of p.aliases ?? []) {
      if (key(alias) === k) return p.code;
    }
  }
  return null;
}

function catalogLabel(p: ReportCatalogRow): string {
  return p.summaryLabel?.trim() || p.name;
}

export function orderMatchesScope(order: ReportOrderInput, scope: ReportScope): boolean {
  if (order.discardedAt) return false;
  const gate = normalizeGateStatus(order.gateDeliveryStatus);
  if (scope === "delivered") return gate === "delivered";
  if (scope === "pipeline") return gate !== "delivered";
  return true;
}

export function orderInDateRange(order: ReportOrderInput, options: ReportOptions): boolean {
  const { dateFrom, dateTo, scope = "all" } = options;
  if (!dateFrom && !dateTo) return true;

  const raw =
    scope === "delivered" && order.gateDeliveredAt
      ? order.gateDeliveredAt
      : order.createdAt;
  if (!raw) return true;

  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return true;

  const from = parseIsoDate(dateFrom ?? undefined);
  const to = parseIsoDate(dateTo ?? undefined);
  if (from && d < from) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

export function filterOrders(
  orders: ReportOrderInput[],
  options: ReportOptions = {},
): ReportOrderInput[] {
  const scope = options.scope ?? "all";
  return orders.filter((o) => orderMatchesScope(o, scope) && orderInDateRange(o, options));
}

export function sheetLinesForOrder(order: ReportOrderInput): DeductionSheetLine[] {
  if (order.sheetLines?.length) {
    return order.sheetLines.map((line, index) => ({
      boxNo: line.boxNo ?? index + 1,
      productName: line.productName,
      bottlesPerBox: line.bottlesPerBox,
      lineKind: line.lineKind,
      mixedContents: line.mixedContents,
      customBoxCode: line.customBoxCode,
    }));
  }

  const standardItems = (order.items ?? [])
    .filter((it) => (it.boxes ?? 0) > 0)
    .map((it) => ({
      productName: it.productName?.trim() ?? "",
      boxes: it.boxes ?? 0,
      bottlesPerBox: it.bottlesPerBox ?? 1,
    }))
    .filter((it) => it.productName);

  const customCartons = [];
  if (order.mixedSample?.contents?.length) {
    customCartons.push({
      boxCount: order.mixedSample.boxCount ?? 1,
      contents: order.mixedSample.contents.map((c) => ({
        productName: c.productName?.trim() ?? "",
        bottles: c.bottles ?? 0,
      })),
    });
  }
  for (const carton of order.customCartons ?? []) {
    customCartons.push({
      boxCount: carton.boxCount ?? 1,
      label: carton.label,
      customBoxCode: carton.customBoxCode,
      contents: (carton.contents ?? []).map((c) => ({
        productName: c.productName?.trim() ?? "",
        bottles: c.bottles ?? 0,
      })),
    });
  }

  const merged = mergeStandardAndCustomSheetLines(standardItems, customCartons);
  return merged.map((line, index) => ({
    boxNo: line.boxNo ?? index + 1,
    productName: line.productName,
    bottlesPerBox: line.bottlesPerBox,
    lineKind: line.lineKind,
    mixedContents: line.mixedContents,
    customBoxCode: line.customBoxCode,
  }));
}

function consumptionForOrder(order: ReportOrderInput, catalog: ReportCatalogRow[]) {
  const lines = sheetLinesForOrder(order);
  return summarizePackagingConsumption(lines, catalogDeduction(catalog));
}

type UnmappedProductStats = {
  bottles: number;
  cartons: number;
  orderIds: Set<string>;
};

function accumulateUnmappedFromOrder(
  order: ReportOrderInput,
  catalogRows: PackingCatalogRow[],
): Map<string, UnmappedProductStats> {
  const byName = new Map<string, UnmappedProductStats>();
  const lines = sheetLinesForOrder(order);

  const add = (rawName: string, bottles: number, cartons: number) => {
    const name = rawName.trim();
    if (!name) return;
    const hit = byName.get(name) ?? { bottles: 0, cartons: 0, orderIds: new Set<string>() };
    hit.bottles += bottles;
    hit.cartons += cartons;
    hit.orderIds.add(order.orderId);
    byName.set(name, hit);
  };

  for (const line of lines) {
    if (isMixedSampleLine(line) && line.mixedContents?.length) {
      for (const part of line.mixedContents) {
        if (!findPackingByName(part.productName, catalogRows)) {
          add(part.productName, part.bottles ?? 0, 0);
        }
      }
      continue;
    }

    if (!findPackingByName(line.productName, catalogRows)) {
      add(line.productName, line.bottlesPerBox ?? 0, 1);
    }
  }

  return byName;
}

function mergeUnmappedMaps(
  target: Map<string, UnmappedProductStats>,
  source: Map<string, UnmappedProductStats>,
): void {
  for (const [name, stats] of source) {
    const hit = target.get(name) ?? { bottles: 0, cartons: 0, orderIds: new Set<string>() };
    hit.bottles += stats.bottles;
    hit.cartons += stats.cartons;
    for (const id of stats.orderIds) hit.orderIds.add(id);
    target.set(name, hit);
  }
}

function unmappedProductRows(unmappedByName: Map<string, UnmappedProductStats>): ProductTotalRow[] {
  return [...unmappedByName.entries()]
    .map(([name, stats]) => ({
      productCode: `unmapped:${key(name)}`,
      productName: name,
      summaryLabel: name,
      cartons: stats.cartons,
      bottles: stats.bottles,
      orderCount: stats.orderIds.size,
      isUnmapped: true,
    }))
    .sort((a, b) => b.bottles - a.bottles || a.productName.localeCompare(b.productName));
}

function aggregateProductMaps(
  orders: ReportOrderInput[],
  catalog: ReportCatalogRow[],
): {
  bottlesByCode: Map<string, number>;
  cartonsByCode: Map<string, number>;
  orderCountByCode: Map<string, number>;
  unmapped: Set<string>;
  unmappedByName: Map<string, UnmappedProductStats>;
} {
  const bottlesByCode = new Map<string, number>();
  const cartonsByCode = new Map<string, number>();
  const orderCountByCode = new Map<string, number>();
  const unmapped = new Set<string>();
  const unmappedByName = new Map<string, UnmappedProductStats>();
  const catalogRows = packingCatalogRows(catalog);

  for (const order of orders) {
    const { consumption, missingProducts } = consumptionForOrder(order, catalog);
    for (const name of missingProducts) unmapped.add(name);
    mergeUnmappedMaps(unmappedByName, accumulateUnmappedFromOrder(order, catalogRows));

    const codesInOrder = new Set<string>();
    for (const [productCode, bottles] of consumption.productBottles) {
      bottlesByCode.set(productCode, (bottlesByCode.get(productCode) ?? 0) + bottles);
      codesInOrder.add(productCode);
    }
    for (const [productCode, cartons] of consumption.productCartons) {
      cartonsByCode.set(productCode, (cartonsByCode.get(productCode) ?? 0) + cartons);
    }
    for (const code of codesInOrder) {
      orderCountByCode.set(code, (orderCountByCode.get(code) ?? 0) + 1);
    }
  }

  return { bottlesByCode, cartonsByCode, orderCountByCode, unmapped, unmappedByName };
}

function productRowsFromMaps(
  catalog: ReportCatalogRow[],
  bottlesByCode: Map<string, number>,
  cartonsByCode: Map<string, number>,
  orderCountByCode: Map<string, number>,
): ProductTotalRow[] {
  const byCode = new Map(catalog.map((p) => [key(p.code), p]));
  const codes = new Set([...bottlesByCode.keys(), ...cartonsByCode.keys()]);

  const rows: ProductTotalRow[] = [];
  for (const productCode of codes) {
    const packing = byCode.get(key(productCode));
    rows.push({
      productCode,
      productName: packing?.name ?? productCode,
      summaryLabel: packing ? catalogLabel(packing) : productCode,
      cartons: cartonsByCode.get(productCode) ?? 0,
      bottles: bottlesByCode.get(productCode) ?? 0,
      orderCount: orderCountByCode.get(productCode) ?? 0,
    });
  }

  return rows.sort((a, b) => b.bottles - a.bottles || a.productName.localeCompare(b.productName));
}

export function buildGrandTotalsReport(
  orders: ReportOrderInput[],
  catalog: ReportCatalogRow[],
  options: ReportOptions = {},
): GrandTotals {
  const filtered = filterOrders(orders, options);
  const { bottlesByCode, cartonsByCode, unmappedByName } = aggregateProductMaps(filtered, catalog);

  let totalBottles = 0;
  let totalCartons = 0;
  for (const n of bottlesByCode.values()) totalBottles += n;
  for (const n of cartonsByCode.values()) totalCartons += n;
  for (const stats of unmappedByName.values()) {
    totalBottles += stats.bottles;
    totalCartons += stats.cartons;
  }

  const customers = new Set(filtered.map((o) => key(o.customerName)).filter(Boolean));

  return {
    orderCount: filtered.length,
    customerCount: customers.size,
    totalCartons,
    totalBottles,
  };
}

export function buildProductTotalsReport(
  orders: ReportOrderInput[],
  catalog: ReportCatalogRow[],
  options: ReportOptions = {},
): ProductTotalsReport {
  const filtered = filterOrders(orders, options);
  const { bottlesByCode, cartonsByCode, orderCountByCode, unmapped, unmappedByName } =
    aggregateProductMaps(filtered, catalog);

  const catalogRows = productRowsFromMaps(catalog, bottlesByCode, cartonsByCode, orderCountByCode);
  const unmappedRows = unmappedProductRows(unmappedByName);
  const products = [...catalogRows, ...unmappedRows].sort(
    (a, b) => b.bottles - a.bottles || a.productName.localeCompare(b.productName),
  );

  return {
    products,
    unmapped: [...new Set([...unmapped, ...unmappedRows.map((row) => row.productName)])].sort(),
    grandTotals: buildGrandTotalsReport(orders, catalog, options),
    customerNames: distinctCustomerNames(filtered).slice(0, 500),
  };
}

export function buildOverviewReport(
  orders: ReportOrderInput[],
  catalog: ReportCatalogRow[],
  options: ReportOptions = {},
): OverviewReport {
  const productReport = buildProductTotalsReport(orders, catalog, options);
  const filtered = filterOrders(orders, options);
  const customerNames = [
    ...new Set(filtered.map((o) => o.customerName.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  return {
    grandTotals: productReport.grandTotals,
    topProducts: productReport.products.slice(0, 10),
    customerNames: customerNames.slice(0, 500),
  };
}

function productsSummaryForOrder(order: ReportOrderInput, catalog: ReportCatalogRow[]): string {
  const { consumption } = consumptionForOrder(order, catalog);
  const parts: string[] = [];
  const byCode = new Map(catalog.map((p) => [key(p.code), p]));

  for (const [code, bottles] of consumption.productBottles) {
    if (bottles <= 0) continue;
    const name = byCode.get(key(code))?.name ?? code;
    parts.push(`${name} (${bottles} bt)`);
  }
  return parts.slice(0, 8).join(", ") + (parts.length > 8 ? "…" : "");
}

export function distinctCustomerNames(orders: ReportOrderInput[]): string[] {
  return [...new Set(orders.map((o) => o.customerName.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function grandTotalsFromCustomerRows(rows: CustomerOrderRow[]): GrandTotals {
  const customers = new Set(rows.map((r) => r.customerName.trim()).filter(Boolean));
  return {
    orderCount: rows.length,
    customerCount: customers.size,
    totalCartons: rows.reduce((sum, row) => sum + row.totalCartons, 0),
    totalBottles: rows.reduce((sum, row) => sum + row.totalBottles, 0),
  };
}

export function buildCustomerOrdersReport(
  orders: ReportOrderInput[],
  catalog: ReportCatalogRow[],
  customerQuery: string,
  options: ReportOptions = {},
  productCodeFilter?: string,
): CustomerOrdersReport {
  const filtered = filterOrders(orders, options);
  const query = customerQuery.trim();
  const customerNames = distinctCustomerNames(filtered).slice(0, 500);
  const productKey = productCodeFilter?.trim() ? key(productCodeFilter.trim()) : "";

  const matched = query
    ? filtered.filter((o) => key(o.customerName).includes(key(query)))
    : [];

  const byCode = new Map(catalog.map((p) => [key(p.code), p]));
  const productTotals: CustomerProductSummaryRow[] = (() => {
    const { bottlesByCode, cartonsByCode, orderCountByCode, unmappedByName } =
      aggregateProductMaps(matched, catalog);
    const rows = [
      ...productRowsFromMaps(catalog, bottlesByCode, cartonsByCode, orderCountByCode),
      ...unmappedProductRows(unmappedByName),
    ].sort((a, b) => b.bottles - a.bottles || a.productName.localeCompare(b.productName));
    return productKey ? rows.filter((row) => key(row.productCode) === productKey) : rows;
  })();

  const rows: CustomerOrderRow[] = [];
  for (const order of matched) {
    const { consumption } = consumptionForOrder(order, catalog);
    let totalBottles = 0;
    let totalCartons = 0;

    if (productKey) {
      totalBottles = consumption.productBottles.get(productKey) ?? 0;
      totalCartons = consumption.productCartons.get(productKey) ?? 0;
      if (totalBottles <= 0 && totalCartons <= 0) continue;

      const packing = byCode.get(productKey);
      const name = packing?.name ?? productCodeFilter ?? productKey;
      const productsSummary = `${name} (${totalBottles} bt)`;
      const created = order.createdAt
        ? new Date(order.createdAt instanceof Date ? order.createdAt : order.createdAt)
        : null;

      rows.push({
        orderId: order.orderId,
        poNumber: order.poNumber,
        customerName: order.customerName,
        createdAt: created && !Number.isNaN(created.getTime()) ? created.toISOString() : "",
        gateDeliveryStatus: normalizeGateStatus(order.gateDeliveryStatus),
        productsSummary,
        totalBottles,
        totalCartons,
      });
    } else {
      for (const n of consumption.productBottles.values()) totalBottles += n;
      for (const n of consumption.productCartons.values()) totalCartons += n;

      const created = order.createdAt
        ? new Date(order.createdAt instanceof Date ? order.createdAt : order.createdAt)
        : null;

      rows.push({
        orderId: order.orderId,
        poNumber: order.poNumber,
        customerName: order.customerName,
        createdAt: created && !Number.isNaN(created.getTime()) ? created.toISOString() : "",
        gateDeliveryStatus: normalizeGateStatus(order.gateDeliveryStatus),
        productsSummary: productsSummaryForOrder(order, catalog),
        totalBottles,
        totalCartons,
      });
    }
  }

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    customerQuery: query,
    orders: rows,
    productTotals,
    customerNames,
    grandTotals: grandTotalsFromCustomerRows(rows),
    productCode: productKey || undefined,
  };
}

export function buildProductDispersionReport(
  orders: ReportOrderInput[],
  catalog: ReportCatalogRow[],
  productCode: string,
  options: ReportOptions = {},
): DispersionReport {
  const codeKey = key(productCode);
  const packing = catalog.find((p) => key(p.code) === codeKey);
  const byCustomer = new Map<string, DispersionRow>();

  for (const order of orders) {
    if (!filterOrders([order], options).length) continue;
    const { consumption } = consumptionForOrder(order, catalog);
    const bottles = consumption.productBottles.get(codeKey) ?? 0;
    const cartons = consumption.productCartons.get(codeKey) ?? 0;
    if (bottles <= 0 && cartons <= 0) continue;

    const customer = order.customerName.trim() || "Unknown";
    const hit = byCustomer.get(customer) ?? {
      customerName: customer,
      cartons: 0,
      bottles: 0,
      orderCount: 0,
    };
    hit.cartons += cartons;
    hit.bottles += bottles;
    hit.orderCount += 1;
    byCustomer.set(customer, hit);
  }

  const rows = [...byCustomer.values()].sort((a, b) => b.bottles - a.bottles);
  const totals = rows.reduce(
    (acc, row) => ({
      cartons: acc.cartons + row.cartons,
      bottles: acc.bottles + row.bottles,
    }),
    { cartons: 0, bottles: 0 },
  );

  return {
    productCode: packing?.code ?? productCode,
    productName: packing?.name ?? productCode,
    rows,
    totals,
    grandTotals: {
      orderCount: rows.reduce((sum, row) => sum + row.orderCount, 0),
      customerCount: rows.length,
      totalCartons: totals.cartons,
      totalBottles: totals.bottles,
    },
  };
}

function entryInDateRange(entryDate: string, options: ReportOptions): boolean {
  const { dateFrom, dateTo } = options;
  if (!dateFrom && !dateTo) return true;
  const d = parseIsoDate(entryDate);
  if (!d) return true;
  const from = parseIsoDate(dateFrom ?? undefined);
  const to = parseIsoDate(dateTo ?? undefined);
  if (from && d < from) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

function batchBottleKey(batchNo: string, productCode: string): string {
  return `${normalizeBatchNo(batchNo).toLowerCase()}::${key(productCode)}`;
}

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function lineBatchBottleAllocations(
  line: NonNullable<ReportOrderInput["sheetLines"]>[number],
  boxNo: number,
  catalog: PackingCatalogRow[],
): Array<{ batchNo: string; productName: string; bottles: number; liters: number }> {
  const allocations = lineBatchAllocations(
    {
      boxNo,
      productName: line.productName,
      bottlesPerBox: line.bottlesPerBox,
      lineKind: line.lineKind,
      mixedContents: line.mixedContents,
      batchNo: line.batchNo,
      componentBatches: line.componentBatches,
    },
    catalog,
  );

  return allocations
    .map((alloc) => {
      const packing = findPackingByName(alloc.productName, catalog);
      const lp = packing
        ? inferLitersPerBottleFromName(packing.name, packing.litersPerBottle)
        : inferLitersPerBottleFromName(alloc.productName);
      const bottles = lp > 0 ? Math.round(alloc.liters / lp) : 0;
      return { batchNo: alloc.batchNo, productName: alloc.productName, bottles, liters: alloc.liters };
    })
    .filter((row) => row.bottles > 0);
}

export function buildBatchBottlesReport(
  batches: ReportBatchInput[],
  fillingEntries: ReportFillingEntry[],
  orders: ReportOrderInput[],
  catalog: ReportCatalogRow[],
  options: ReportOptions = {},
  batchQuery = "",
  productCodeFilter?: string,
): BatchBottlesReport {
  const packingRows = packingCatalogRows(catalog);
  const batchMeta = new Map(
    batches.map((b) => [normalizeBatchNo(b.batchNo).toLowerCase(), b]),
  );

  const filledByKey = new Map<string, number>();
  const orderByKey = new Map<string, number>();
  const productNameByKey = new Map<string, string>();
  const productCodeByKey = new Map<string, string>();
  const batchNoByKey = new Map<string, string>();
  const destinationRowsAll: BatchDestinationRow[] = [];

  for (const entry of fillingEntries) {
    if (!entryInDateRange(entry.entryDate, options)) continue;
    const batchNorm = normalizeBatchNo(entry.batchNo).toLowerCase();
    if (!batchNorm) continue;

    for (const line of entry.packingLines ?? []) {
      const bottles = line.filledBottlesToday ?? 0;
      if (bottles <= 0) continue;
      const code = line.productCode.trim().toLowerCase();
      const rowKey = batchBottleKey(entry.batchNo, code);
      filledByKey.set(rowKey, (filledByKey.get(rowKey) ?? 0) + bottles);
      productNameByKey.set(rowKey, line.productName);
      productCodeByKey.set(rowKey, code);
      batchNoByKey.set(rowKey, entry.batchNo.trim());
    }
  }

  for (const order of filterOrders(orders, options)) {
    const lines = order.sheetLines ?? [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const boxNo = line.boxNo ?? index + 1;
      for (const alloc of lineBatchBottleAllocations(line, boxNo, packingRows)) {
        const code = resolveCatalogCode(alloc.productName, catalog) ?? alloc.productName;
        const rowKey = batchBottleKey(alloc.batchNo, code);
        orderByKey.set(rowKey, (orderByKey.get(rowKey) ?? 0) + alloc.bottles);
        productNameByKey.set(rowKey, alloc.productName);
        productCodeByKey.set(rowKey, key(code));
        batchNoByKey.set(rowKey, alloc.batchNo);
        destinationRowsAll.push({
          batchNo: alloc.batchNo,
          productCode: key(code),
          productName: alloc.productName,
          orderId: order.orderId,
          poNumber: order.poNumber,
          customerName: order.customerName,
          gateDeliveryStatus: normalizeGateStatus(order.gateDeliveryStatus),
          createdAt: toIsoString(order.createdAt),
          deliveredAt: toIsoString(order.gateDeliveredAt),
          vehicleNo: order.dispatch?.vehicleNo?.trim() ?? "",
          dcNo: order.dispatch?.dcNo?.trim() ?? "",
          boxNo,
          bottles: alloc.bottles,
          liters: Math.round(alloc.liters * 1000) / 1000,
        });
      }
    }
  }

  const query = batchQuery.trim().toLowerCase();
  const productKey = productCodeFilter?.trim() ? key(productCodeFilter.trim()) : "";
  const keys = new Set([...filledByKey.keys(), ...orderByKey.keys()]);
  const rows: BatchBottleLineRow[] = [];

  for (const rowKey of keys) {
    const filledBottles = filledByKey.get(rowKey) ?? 0;
    const orderBottles = orderByKey.get(rowKey) ?? 0;
    if (filledBottles <= 0 && orderBottles <= 0) continue;

    const batchNo = batchNoByKey.get(rowKey) ?? "";
    const batchNorm = normalizeBatchNo(batchNo).toLowerCase();
    if (query && !batchNorm.includes(query) && !batchNo.toLowerCase().includes(query)) continue;

    const meta = batchMeta.get(batchNorm);
    const productCode = productCodeByKey.get(rowKey) ?? "";
    if (productKey && key(productCode) !== productKey) continue;
    const productName = productNameByKey.get(rowKey) ?? productCode;

    rows.push({
      batchId: meta?.batchId ?? "",
      batchNo: meta?.batchNo ?? batchNo,
      poolProductName: meta?.productName ?? "",
      productCode,
      productName,
      filledBottles,
      orderBottles,
      totalBottles: filledBottles + orderBottles,
    });
  }

  rows.sort(
    (a, b) =>
      b.batchNo.localeCompare(a.batchNo) ||
      b.totalBottles - a.totalBottles ||
      a.productName.localeCompare(b.productName),
  );

  const destinationRows = destinationRowsAll
    .filter((row) => {
      const batchNorm = normalizeBatchNo(row.batchNo).toLowerCase();
      if (query && !batchNorm.includes(query) && !row.batchNo.toLowerCase().includes(query)) return false;
      if (productKey && key(row.productCode) !== productKey) return false;
      return true;
    })
    .sort(
      (a, b) =>
        b.batchNo.localeCompare(a.batchNo) ||
        a.customerName.localeCompare(b.customerName) ||
        a.poNumber.localeCompare(b.poNumber) ||
        a.boxNo - b.boxNo,
    );

  const batchNumbers = [
    ...new Set([
      ...batches.map((b) => b.batchNo.trim()).filter(Boolean),
      ...fillingEntries.map((e) => e.batchNo.trim()).filter(Boolean),
      ...destinationRowsAll.map((row) => row.batchNo.trim()).filter(Boolean),
    ]),
  ]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 500);

  const bottleTotals = rows.reduce(
    (acc, row) => ({
      filledBottles: acc.filledBottles + row.filledBottles,
      orderBottles: acc.orderBottles + row.orderBottles,
      totalBottles: acc.totalBottles + row.totalBottles,
    }),
    { filledBottles: 0, orderBottles: 0, totalBottles: 0 },
  );
  const destinationOrderIds = new Set(destinationRows.map((row) => row.orderId));
  const destinationCustomers = new Set(destinationRows.map((row) => key(row.customerName)).filter(Boolean));
  const totals = {
    ...bottleTotals,
    destinationBottles: destinationRows.reduce((sum, row) => sum + row.bottles, 0),
    destinationLiters: Math.round(destinationRows.reduce((sum, row) => sum + row.liters, 0) * 1000) / 1000,
    destinationOrders: destinationOrderIds.size,
    destinationCustomers: destinationCustomers.size,
  };

  return {
    batchQuery: batchQuery.trim(),
    batchNumbers,
    rows,
    destinationRows,
    totals,
    grandTotals: {
      orderCount: totals.destinationOrders,
      customerCount: totals.destinationCustomers,
      totalCartons: 0,
      totalBottles: totals.totalBottles,
    },
  };
}

export function formatReportDate(d = new Date()): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
