"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminOrderSummary } from "@/lib/adminOrderSummary";

export function AdminSummaryDashboard() {
  const [data, setData] = useState<AdminOrderSummary | null>(null);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = pendingOnly ? "?pendingOnly=true" : "";
      const res = await fetch(`/api/admin/summary${qs}`, { credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setError("Could not load summary.");
        return;
      }
      const json = (await res.json()) as AdminOrderSummary;
      setData(json);
    } catch {
      setError("Could not load summary.");
    } finally {
      setLoading(false);
    }
  }, [pendingOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="-mx-4 print:mx-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Pending orders</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Management summary — carton counts per product column.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Pending only
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Print
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 px-4 text-sm text-zinc-600 print:hidden">Loading…</p>
      ) : error ? (
        <p className="mt-6 px-4 text-sm text-red-700 print:hidden">{error}</p>
      ) : data ? (
        <div className="mt-6 overflow-x-auto px-4 print:mt-2 print:px-0">
          <div className="min-w-max rounded-xl border border-zinc-200 bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none">
            <div className="mb-4 text-center print:mb-2">
              <div className="text-base font-bold uppercase tracking-wide text-zinc-900 print:text-sm">
                Pending orders
              </div>
              <div className="text-sm text-zinc-700 print:text-xs">{data.reportDate}</div>
            </div>

            <table className="w-full border-collapse border border-zinc-400 text-xs print:text-[10px]">
              <thead>
                <tr className="bg-zinc-100 print:bg-transparent">
                  <th className="border border-zinc-400 px-2 py-1 text-left font-semibold">Sr</th>
                  <th className="border border-zinc-400 px-2 py-1 text-left font-semibold">Customer</th>
                  <th className="border border-zinc-400 px-2 py-1 text-left font-semibold">City</th>
                  <th className="border border-zinc-400 px-2 py-1 text-left font-semibold">Deadline</th>
                  <th className="border border-zinc-400 px-2 py-1 text-left font-semibold">PO no</th>
                  {data.columns.map((col) => (
                    <th
                      key={col.key}
                      className="border border-zinc-400 px-1 py-1 text-center font-semibold whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="border border-zinc-400 px-2 py-1 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6 + data.columns.length}
                      className="border border-zinc-400 px-2 py-4 text-center text-zinc-600"
                    >
                      No orders to show.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => (
                    <tr key={`${row.poNumber}-${row.sr}`}>
                      <td className="border border-zinc-400 px-2 py-1">{row.sr}</td>
                      <td className="border border-zinc-400 px-2 py-1 whitespace-nowrap">{row.customerName}</td>
                      <td className="border border-zinc-400 px-2 py-1 whitespace-nowrap">{row.city}</td>
                      <td
                        className={`border border-zinc-400 px-2 py-1 whitespace-nowrap ${
                          row.builtyDone ? "font-semibold text-emerald-800" : ""
                        }`}
                      >
                        {row.deadlineDisplay}
                      </td>
                      <td className="border border-zinc-400 px-2 py-1 whitespace-nowrap">{row.poNumber}</td>
                      {data.columns.map((col) => {
                        const n = row.cells[col.key] ?? 0;
                        return (
                          <td key={col.key} className="border border-zinc-400 px-1 py-1 text-center">
                            {n > 0 ? n : ""}
                          </td>
                        );
                      })}
                      <td className="border border-zinc-400 px-2 py-1 text-center font-medium">{row.rowTotal}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {data.rows.length > 0 ? (
                <tfoot>
                  <tr className="bg-zinc-50 font-semibold print:bg-transparent">
                    <td
                      colSpan={5}
                      className="border border-zinc-400 px-2 py-1 text-right uppercase tracking-wide"
                    >
                      Totals
                    </td>
                    {data.columns.map((col) => (
                      <td key={col.key} className="border border-zinc-400 px-1 py-1 text-center">
                        {(data.columnTotals[col.key] ?? 0) > 0 ? data.columnTotals[col.key] : ""}
                      </td>
                    ))}
                    <td className="border border-zinc-400 px-2 py-1 text-center">{data.grandTotal}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
