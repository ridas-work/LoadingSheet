"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TrackedPrintButton } from "@/components/TrackedPrintButton";

import type {
  BatchBottlesReport,
  CustomerOrdersReport,
  DispersionReport,
  GrandTotals,
  ProductTotalRow,
  ProductTotalsReport,
  ReportScope,
} from "@/lib/adminOperationsReports.types";
import { formatDisplayDate } from "@/lib/dateOnly";
import { ui } from "@/lib/ui";

type ReportView = "products" | "customers" | "dispersion" | "batches";

const reportTableClass =
  "w-full max-w-5xl table-fixed border-collapse border border-zinc-300 text-sm print:max-w-none print:text-[10px]";

const emptyTotals: GrandTotals = {
  orderCount: 0,
  customerCount: 0,
  totalCartons: 0,
  totalBottles: 0,
};

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtAmount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function gateLabel(status: string): string {
  switch (status) {
    case "delivered":
      return "Delivered";
    case "out_for_delivery":
      return "Out for delivery";
    case "pending_redelivery":
      return "Pending redelivery";
    default:
      return "In pipeline";
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const formatted = formatDisplayDate(iso);
  return formatted || "—";
}

function resolveReportView(filters: {
  customer: string;
  productCode: string;
  batch: string;
}): ReportView {
  if (filters.batch) return "batches";
  if (filters.customer) return "customers";
  if (filters.productCode) return "dispersion";
  return "products";
}

function buildQuery(
  view: ReportView,
  scope: ReportScope,
  dateFrom: string,
  dateTo: string,
  filters: { customer: string; productCode: string; batch: string },
): string {
  const params = new URLSearchParams({ view, scope });
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (filters.customer) params.set("customer", filters.customer);
  if (filters.productCode) params.set("productCode", filters.productCode);
  if (filters.batch) params.set("batch", filters.batch);
  return params.toString();
}

function GrandTotalCards({ totals }: { totals: GrandTotals }) {
  const cards = [
    { label: "Orders", value: totals.orderCount },
    { label: "Customers", value: totals.customerCount },
    { label: "Cartons", value: totals.totalCartons },
    { label: "Bottles", value: totals.totalBottles },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{card.label}</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{fmt(card.value)}</div>
        </div>
      ))}
    </div>
  );
}

function ProductsTable({
  products,
  grandTotals,
  showFooter = true,
}: {
  products: ProductTotalRow[];
  grandTotals?: GrandTotals;
  showFooter?: boolean;
}) {
  return (
    <table className={reportTableClass}>
      <colgroup>
        <col className="w-[42%]" />
        <col className="w-[19%]" />
        <col className="w-[19%]" />
        <col className="w-[20%]" />
      </colgroup>
      <thead>
        <tr className="bg-zinc-100 print:bg-transparent">
          <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Product</th>
          <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Cartons</th>
          <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Bottles</th>
          <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Orders</th>
        </tr>
      </thead>
      <tbody>
        {products.length === 0 ? (
          <tr>
            <td colSpan={4} className="border border-zinc-300 px-3 py-6 text-center text-zinc-600">
              No products in this scope.
            </td>
          </tr>
        ) : (
          products.map((row) => (
            <tr
              key={row.productCode}
              className={row.isUnmapped ? "bg-amber-50/50 even:bg-amber-50/70" : "even:bg-zinc-50/60"}
            >
              <td className="border border-zinc-300 px-3 py-2">
                {row.summaryLabel || row.productName}
                {row.isUnmapped ? (
                  <span className="ml-1.5 text-xs font-medium text-amber-800">(unmapped)</span>
                ) : null}
              </td>
              <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">{fmt(row.cartons)}</td>
              <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">{fmt(row.bottles)}</td>
              <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">{fmt(row.orderCount)}</td>
            </tr>
          ))
        )}
      </tbody>
      {showFooter && grandTotals ? (
        <tfoot>
          <tr className="bg-zinc-100 font-semibold print:bg-transparent">
            <td className="border border-zinc-300 px-3 py-2">Grand total</td>
            <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
              {fmt(grandTotals.totalCartons)}
            </td>
            <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
              {fmt(grandTotals.totalBottles)}
            </td>
            <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
              {fmt(grandTotals.orderCount)}
            </td>
          </tr>
        </tfoot>
      ) : null}
    </table>
  );
}

export function AdminReportsHub() {
  const [scope, setScope] = useState<ReportScope>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerInput, setCustomerInput] = useState("");
  const [productCode, setProductCode] = useState("");
  const [batchInput, setBatchInput] = useState("");

  const [applied, setApplied] = useState({
    customer: "",
    productCode: "",
    batch: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grandTotals, setGrandTotals] = useState<GrandTotals>(emptyTotals);
  const [products, setProducts] = useState<ProductTotalsReport | null>(null);
  const [customers, setCustomers] = useState<CustomerOrdersReport | null>(null);
  const [dispersion, setDispersion] = useState<DispersionReport | null>(null);
  const [batchBottles, setBatchBottles] = useState<BatchBottlesReport | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<ProductTotalRow[]>([]);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [batchNumbers, setBatchNumbers] = useState<string[]>([]);

  const activeView = useMemo(() => resolveReportView(applied), [applied]);

  const productOptions = useMemo(() => {
    const source = catalogProducts.length > 0 ? catalogProducts : products?.products ?? [];
    return source.map((p) => ({
      code: p.productCode,
      label: p.summaryLabel || p.productName,
    }));
  }, [catalogProducts, products]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery(activeView, scope, dateFrom, dateTo, applied);
      const res = await fetch(`/api/admin/reports?${qs}`, { credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not load report.");
        return;
      }

      const json = await res.json();
      switch (activeView) {
        case "products": {
          const data = json as ProductTotalsReport;
          setProducts(data);
          setGrandTotals(data.grandTotals);
          if (data.customerNames?.length) setCustomerNames(data.customerNames);
          break;
        }
        case "customers": {
          const data = json as CustomerOrdersReport;
          setCustomers(data);
          setGrandTotals(data.grandTotals);
          if (data.customerNames?.length) setCustomerNames(data.customerNames);
          break;
        }
        case "dispersion": {
          const data = json as DispersionReport;
          setDispersion(data);
          setGrandTotals(data.grandTotals);
          break;
        }
        case "batches": {
          const data = json as BatchBottlesReport;
          setBatchBottles(data);
          setGrandTotals(data.grandTotals);
          if (data.batchNumbers?.length) setBatchNumbers(data.batchNumbers);
          break;
        }
      }
    } catch {
      setError("Could not load report.");
    } finally {
      setLoading(false);
    }
  }, [activeView, scope, dateFrom, dateTo, applied]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/reports?view=products&scope=all", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const json = (await res.json()) as ProductTotalsReport;
        setCatalogProducts(json.products ?? []);
        if (json.customerNames?.length) setCustomerNames(json.customerNames);
      } catch {
        // Catalog list for filter dropdowns.
      }
    })();
  }, []);

  const customerSuggestions = useMemo(() => {
    const names = customerNames;
    const q = customerInput.trim().toLowerCase();
    if (!q) return names.slice(0, 30);
    return names.filter((n) => n.toLowerCase().includes(q)).slice(0, 30);
  }, [customerNames, customerInput]);

  function handleApply() {
    setApplied({
      customer: customerInput.trim(),
      productCode: productCode.trim(),
      batch: batchInput.trim(),
    });
  }

  function handleClearFilters() {
    setCustomerInput("");
    setProductCode("");
    setBatchInput("");
    setApplied({ customer: "", productCode: "", batch: "" });
  }

  const resultTitle = useMemo(() => {
    if (activeView === "customers" && applied.customer) {
      return applied.productCode
        ? `Orders for ${applied.customer} — filtered by product`
        : `Orders for ${applied.customer}`;
    }
    if (activeView === "dispersion" && dispersion) {
      return `${dispersion.productName} — customer breakdown`;
    }
    if (activeView === "batches") {
      return applied.batch ? `Batch ${applied.batch} — bottles` : "All batches — bottles";
    }
    return "All products";
  }, [activeView, applied, dispersion]);

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className={ui.pageHeader}>
          <h1 className={ui.pageTitle}>Operations reports</h1>
          <p className={ui.pageDesc}>
            One overview — use filters to drill into customers, products, or batches.
          </p>
        </div>
        <TrackedPrintButton
          printLog={{
            documentType: "admin_report",
            documentTitle: `Operations report — ${activeView}`,
            referencePath: "/admin/reports",
            metadata: { scope, activeView },
          }}
          className={ui.btnPrimary}
        >
          Print
        </TrackedPrintButton>
      </div>

      <div className={`${ui.card} flex flex-wrap items-end gap-4 p-4 print:hidden`}>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Scope
          </span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ReportScope)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="all">All orders</option>
            <option value="delivered">Delivered only</option>
            <option value="pipeline">In pipeline</option>
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            From
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            To
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>

        <div className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Customer
          </span>
          <input
            type="text"
            value={customerInput}
            onChange={(e) => setCustomerInput(e.target.value)}
            placeholder="Search customer…"
            className="w-full min-w-[180px] rounded border border-zinc-300 px-2 py-1.5 text-sm"
            list="customer-suggestions"
          />
          <datalist id="customer-suggestions">
            {customerSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Product
          </span>
          <select
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            className="min-w-[200px] rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All products</option>
            {productOptions.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Batch no
          </span>
          <input
            type="text"
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="e.g. 260415"
            className="w-full min-w-[160px] rounded border border-zinc-300 px-2 py-1.5 text-sm"
            list="batch-suggestions"
          />
          <datalist id="batch-suggestions">
            {batchNumbers.map((no) => (
              <option key={no} value={no} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleApply} className={ui.btnPrimary}>
            Apply
          </button>
          <button type="button" onClick={handleClearFilters} className={ui.btn}>
            Clear filters
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600 print:hidden">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-700 print:hidden">{error}</p>
      ) : (
        <div className={`${ui.card} p-4 print:border-0 print:p-0 print:shadow-none`}>
          <GrandTotalCards totals={grandTotals} />
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">{resultTitle}</h2>

          {activeView === "products" && products ? (
            <ProductsTable products={products.products} grandTotals={products.grandTotals} />
          ) : null}

          {activeView === "customers" ? (
            applied.customer && customers ? (
              <>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Customer product totals
                </h3>
                <div className="mb-5">
                  <ProductsTable products={customers.productTotals} showFooter={false} />
                </div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  PO history
                </h3>
                <table className={reportTableClass}>
                  <colgroup>
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[16%]" />
                    <col className="w-[34%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-zinc-100 print:bg-transparent">
                      <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">PO no</th>
                      <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Date</th>
                      <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Status</th>
                      <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Products</th>
                      <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Cartons</th>
                      <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Bottles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.orders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="border border-zinc-300 px-3 py-6 text-center text-zinc-600"
                        >
                          No orders for this customer in the selected scope.
                        </td>
                      </tr>
                    ) : (
                      customers.orders.map((row) => (
                        <tr key={row.orderId} className="even:bg-zinc-50/60">
                          <td className="border border-zinc-300 px-3 py-2">
                            <Link
                              href={`/orders/${row.orderId}/loading-sheet`}
                              className="text-teal-800 underline"
                            >
                              {row.poNumber}
                            </Link>
                          </td>
                          <td className="border border-zinc-300 px-3 py-2">{formatDate(row.createdAt)}</td>
                          <td className="border border-zinc-300 px-3 py-2">{gateLabel(row.gateDeliveryStatus)}</td>
                          <td className="border border-zinc-300 px-3 py-2">{row.productsSummary || "—"}</td>
                          <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                            {fmt(row.totalCartons)}
                          </td>
                          <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                            {fmt(row.totalBottles)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-sm text-zinc-600">Enter a customer and click Apply to see their PO history.</p>
            )
          ) : null}

          {activeView === "dispersion" && dispersion ? (
            <table className={reportTableClass}>
              <colgroup>
                <col className="w-[46%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="bg-zinc-100 print:bg-transparent">
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Customer</th>
                  <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Cartons</th>
                  <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Bottles</th>
                  <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Orders</th>
                </tr>
              </thead>
              <tbody>
                {dispersion.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="border border-zinc-300 px-3 py-6 text-center text-zinc-600"
                    >
                      No customers received this product in the selected scope.
                    </td>
                  </tr>
                ) : (
                  dispersion.rows.map((row) => (
                    <tr key={row.customerName} className="even:bg-zinc-50/60">
                      <td className="border border-zinc-300 px-3 py-2">{row.customerName}</td>
                      <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                        {fmt(row.cartons)}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                        {fmt(row.bottles)}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                        {fmt(row.orderCount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100 font-semibold print:bg-transparent">
                  <td className="border border-zinc-300 px-3 py-2">Total</td>
                  <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                    {fmt(dispersion.totals.cartons)}
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                    {fmt(dispersion.totals.bottles)}
                  </td>
                  <td className="border border-zinc-300 px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          ) : null}

          {activeView === "batches" && batchBottles ? (
            <>
              <p className="mb-3 text-sm text-zinc-600">
                Bottles filled from each batch (Rashid filling sheet) and bottles assigned on loading
                sheets for POs in the selected scope.
              </p>
              <table className={reportTableClass}>
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[22%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="bg-zinc-100 print:bg-transparent">
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Batch no</th>
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Pool product</th>
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Packing / size</th>
                    <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Filled</th>
                    <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">On POs</th>
                    <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {batchBottles.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="border border-zinc-300 px-3 py-6 text-center text-zinc-600"
                      >
                        No bottle counts for this batch and date range.
                      </td>
                    </tr>
                  ) : (
                    batchBottles.rows.map((row) => (
                      <tr
                        key={`${row.batchNo}-${row.productCode}`}
                        className="even:bg-zinc-50/60"
                      >
                        <td className="border border-zinc-300 px-3 py-2">
                          {row.batchId ? (
                            <Link
                              href={`/production/batches/${row.batchId}`}
                              className="text-teal-800 underline"
                            >
                              {row.batchNo}
                            </Link>
                          ) : (
                            row.batchNo
                          )}
                        </td>
                        <td className="border border-zinc-300 px-3 py-2">{row.poolProductName || "—"}</td>
                        <td className="border border-zinc-300 px-3 py-2">{row.productName}</td>
                        <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                          {fmt(row.filledBottles)}
                        </td>
                        <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                          {fmt(row.orderBottles)}
                        </td>
                        <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums font-medium">
                          {fmt(row.totalBottles)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {batchBottles.rows.length > 0 ? (
                  <tfoot>
                    <tr className="bg-zinc-100 font-semibold print:bg-transparent">
                      <td colSpan={3} className="border border-zinc-300 px-3 py-2">
                        Grand total
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                        {fmt(batchBottles.totals.filledBottles)}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                        {fmt(batchBottles.totals.orderBottles)}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                        {fmt(batchBottles.totals.totalBottles)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
              <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Where this batch went
              </h3>
              <p className="mb-3 text-sm text-zinc-600">
                Trace from loading sheet batch assignments to PO, customer, vehicle, and challan/DC.
              </p>
              <table className={reportTableClass}>
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[16%]" />
                  <col className="w-[11%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[11%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                </colgroup>
                <thead>
                  <tr className="bg-zinc-100 print:bg-transparent">
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Batch no</th>
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Product</th>
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">PO no</th>
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Customer</th>
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Vehicle</th>
                    <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">DC</th>
                    <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Box</th>
                    <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Bottles</th>
                    <th className="border border-zinc-300 px-3 py-2 text-right font-semibold">Liters</th>
                  </tr>
                </thead>
                <tbody>
                  {batchBottles.destinationRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="border border-zinc-300 px-3 py-6 text-center text-zinc-600"
                      >
                        No loading sheet destinations for this batch in the selected scope.
                      </td>
                    </tr>
                  ) : (
                    batchBottles.destinationRows.map((row) => (
                      <tr
                        key={`${row.batchNo}-${row.orderId}-${row.boxNo}-${row.productCode}`}
                        className="even:bg-zinc-50/60"
                      >
                        <td className="border border-zinc-300 px-3 py-2">{row.batchNo}</td>
                        <td className="border border-zinc-300 px-3 py-2">{row.productName}</td>
                        <td className="border border-zinc-300 px-3 py-2">
                          <Link href={`/orders/${row.orderId}/loading-sheet`} className="text-teal-800 underline">
                            {row.poNumber}
                          </Link>
                        </td>
                        <td className="border border-zinc-300 px-3 py-2">{row.customerName}</td>
                        <td className="border border-zinc-300 px-3 py-2">{row.vehicleNo || "—"}</td>
                        <td className="border border-zinc-300 px-3 py-2">{row.dcNo || "—"}</td>
                        <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                          {row.boxNo}
                        </td>
                        <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                          {fmt(row.bottles)}
                        </td>
                        <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                          {fmtAmount(row.liters)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {batchBottles.destinationRows.length > 0 ? (
                  <tfoot>
                    <tr className="bg-zinc-100 font-semibold print:bg-transparent">
                      <td colSpan={7} className="border border-zinc-300 px-3 py-2">
                        Destination total
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                        {fmt(batchBottles.totals.destinationBottles)}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums">
                        {fmtAmount(batchBottles.totals.destinationLiters)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
