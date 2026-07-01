"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { OrderPoDetailPanel } from "@/components/OrderPoDetailPanel";
import type { AdminOrderSummary, SummaryRow } from "@/lib/adminOrderSummary";
import { ui } from "@/lib/ui";

function normalizeCityKey(city: string): string {
  return city.trim().toLowerCase();
}

function buildCityOptions(rows: SummaryRow[]): Array<{ key: string; label: string }> {
  const variants = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const city = row.city?.trim();
    if (!city) continue;
    const key = normalizeCityKey(city);
    const counts = variants.get(key) ?? new Map<string, number>();
    counts.set(city, (counts.get(city) ?? 0) + 1);
    variants.set(key, counts);
  }
  const options: Array<{ key: string; label: string }> = [];
  for (const [key, counts] of variants) {
    const label = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? key;
    options.push({ key, label });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function filterSummaryRows(
  rows: SummaryRow[],
  filters: { customer: string; city: string; status: string; po: string },
) {
  const customerQ = filters.customer.trim().toLowerCase();
  const poQ = filters.po.trim().toLowerCase();
  const cityKey = filters.city.trim();

  return rows.filter((row) => {
    if (customerQ && !row.customerName.toLowerCase().includes(customerQ)) return false;
    if (cityKey && normalizeCityKey(row.city) !== cityKey) return false;
    if (filters.status && row.gateDeliveryStatus !== filters.status) return false;
    if (poQ && !row.poNumber.toLowerCase().includes(poQ)) return false;
    return true;
  });
}

export function AdminSummaryDashboard() {
  const [data, setData] = useState<AdminOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingOnly, setPendingOnly] = useState(true);
  const [customerFilter, setCustomerFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [poFilter, setPoFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/summary?pendingOnly=${pendingOnly ? "1" : "0"}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Could not load summary");
      const json = (await res.json()) as AdminOrderSummary;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [pendingOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return filterSummaryRows(data.rows, {
      customer: customerFilter,
      city: cityFilter,
      status: statusFilter,
      po: poFilter,
    });
  }, [data, customerFilter, cityFilter, statusFilter, poFilter]);

  const cityOptions = useMemo(() => (data ? buildCityOptions(data.rows) : []), [data]);

  const filteredTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let grand = 0;
    if (!data) return { totals, grand };
    for (const col of data.columns) totals[col.key] = 0;
    for (const row of filteredRows) {
      grand += row.rowTotal;
      for (const col of data.columns) {
        totals[col.key] += row.cells[col.key] ?? 0;
      }
    }
    return { totals, grand };
  }, [data, filteredRows]);

  const tableColSpan = (data?.columns.length ?? 0) + 7;

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading orders summary…</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-red-700">{error || "Summary unavailable."}</p>;
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <div className={`${ui.pageHeader} print:hidden`}>
        <h1 className={ui.pageTitle}>Pending orders</h1>
        <p className={ui.pageDesc}>
          Report date: {data.reportDate}
          {data.pendingApprovalCount > 0 ? (
            <>
              {" "}
              ·{" "}
              <Link href="/admin/approvals" className="font-medium underline">
                {data.pendingApprovalCount} PO{data.pendingApprovalCount === 1 ? "" : "s"} awaiting approval
              </Link>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm">
          <span className={ui.label}>Customer</span>
          <input
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className={`${ui.input} mt-1 w-40`}
            placeholder="Search…"
          />
        </label>
        <label className="text-sm">
          <span className={ui.label}>City</span>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className={`${ui.input} mt-1 w-36`}
          >
            <option value="">All</option>
            {cityOptions.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className={ui.label}>Gate status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${ui.input} mt-1 w-40`}
          >
            <option value="">All</option>
            <option value="none">At gate</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="pending_redelivery">Pending redelivery</option>
            <option value="delivered">Delivered</option>
          </select>
        </label>
        <label className="text-sm">
          <span className={ui.label}>PO no</span>
          <input
            value={poFilter}
            onChange={(e) => setPoFilter(e.target.value)}
            className={`${ui.input} mt-1 w-28`}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          Hide delivered
        </label>
        <button type="button" onClick={() => window.print()} className={ui.btnSecondarySm}>
          Print
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse border border-zinc-300 text-xs print:text-[10px]">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-zinc-300 px-2 py-1 text-left">Sr</th>
              <th className="border border-zinc-300 px-2 py-1 text-left">Customer</th>
              <th className="border border-zinc-300 px-2 py-1 text-left">City</th>
              <th className="border border-zinc-300 px-2 py-1 text-left">Deadline</th>
              <th className="border border-zinc-300 px-2 py-1 text-left">Status</th>
              <th className="border border-zinc-300 px-2 py-1 text-left">PO</th>
              {data.columns.map((col) => (
                <th key={col.key} className="border border-zinc-300 px-2 py-1 text-right">
                  {col.label}
                </th>
              ))}
              <th className="border border-zinc-300 px-2 py-1 text-right">Total</th>
              <th className="border border-zinc-300 px-2 py-1 print:hidden">Detail</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} className="border border-zinc-300 px-2 py-4 text-center text-zinc-600">
                  No orders match these filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <Fragment key={row.orderId}>
                  <tr className={row.builtyDone ? "bg-emerald-50/60" : undefined}>
                    <td className="border border-zinc-300 px-2 py-1">{row.sr}</td>
                    <td className="border border-zinc-300 px-2 py-1">{row.customerName}</td>
                    <td className="border border-zinc-300 px-2 py-1">{row.city || "—"}</td>
                    <td className="border border-zinc-300 px-2 py-1 font-medium">{row.deadlineDisplay || "—"}</td>
                    <td className="border border-zinc-300 px-2 py-1">{row.statusLabel}</td>
                    <td className="border border-zinc-300 px-2 py-1">
                      <Link href={`/orders/${row.orderId}/loading-sheet`} className="underline">
                        {row.poNumber}
                      </Link>
                    </td>
                    {data.columns.map((col) => (
                      <td key={col.key} className="border border-zinc-300 px-2 py-1 text-right tabular-nums">
                        {row.cells[col.key] ? row.cells[col.key].toLocaleString() : ""}
                      </td>
                    ))}
                    <td className="border border-zinc-300 px-2 py-1 text-right font-medium tabular-nums">
                      {row.rowTotal ? row.rowTotal.toLocaleString() : ""}
                    </td>
                    <td className="border border-zinc-300 px-2 py-1 print:hidden">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(row.orderId)}
                        className={ui.btnGhost}
                      >
                        {expandedIds.has(row.orderId) ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                  {expandedIds.has(row.orderId) ? (
                    <tr className="print:hidden">
                      <td colSpan={tableColSpan} className="border border-zinc-300 bg-zinc-50 px-3 py-2">
                        <OrderPoDetailPanel detail={row.detail} compact />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
            <tr className="bg-zinc-100 font-semibold">
              <td colSpan={6} className="border border-zinc-300 px-2 py-1 text-right">
                Column totals
              </td>
              {data.columns.map((col) => (
                <td key={col.key} className="border border-zinc-300 px-2 py-1 text-right tabular-nums">
                  {filteredTotals.totals[col.key]
                    ? filteredTotals.totals[col.key].toLocaleString()
                    : ""}
                </td>
              ))}
              <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">
                {filteredTotals.grand.toLocaleString()}
              </td>
              <td className="border border-zinc-300 print:hidden" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
