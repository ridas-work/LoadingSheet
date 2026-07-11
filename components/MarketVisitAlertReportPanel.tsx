"use client";

import { useCallback, useEffect, useState } from "react";

import { MarketVisitGrid } from "@/components/MarketVisitGrid";
import type { MarketVisitGridReport } from "@/lib/marketVisitAlertReport.types";
import { ui } from "@/lib/ui";

export function MarketVisitAlertReportPanel() {
  const [storeInput, setStoreInput] = useState("");
  const [appliedStore, setAppliedStore] = useState("");
  const [report, setReport] = useState<MarketVisitGridReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (store: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (store.trim()) params.set("store", store.trim());
      const res = await fetch(`/api/admin/market-visit-alerts?${params.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Access denied" : "Could not load report");
      }
      const data = (await res.json()) as MarketVisitGridReport;
      setReport(data);
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("");
  }, [load]);

  function applyFilter() {
    setAppliedStore(storeInput.trim());
    void load(storeInput);
  }

  function clearFilter() {
    setStoreInput("");
    setAppliedStore("");
    void load("");
  }

  const storeNames = report?.storeNames ?? [];

  return (
    <div className="market-visit-form space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="store-filter"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Store name
          </label>
          <input
            id="store-filter"
            type="text"
            value={storeInput}
            onChange={(e) => setStoreInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilter();
            }}
            placeholder="e.g. al fatah — leave empty for all stores"
            list="market-store-suggestions"
            className="w-full min-w-[200px] rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <datalist id="market-store-suggestions">
            {storeNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <button type="button" onClick={applyFilter} className={ui.btnPrimarySm} disabled={loading}>
          Search
        </button>
        {appliedStore ? (
          <button type="button" onClick={clearFilter} className={ui.btnSecondarySm} disabled={loading}>
            Clear
          </button>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}
      {error ? <div className={ui.alertDanger}>{error}</div> : null}

      {!loading && !error && report ? (
        <>
          <p className="text-sm text-zinc-600">
            {appliedStore
              ? `Rows for stores matching “${appliedStore}”.`
              : "All store rows from Aslam and Ahtisham market visits."}{" "}
            Red = <strong>N</strong> or still open until marked <strong>Y</strong>.
          </p>

          {report.rows.length === 0 ? (
            <div className={ui.alertInfo}>
              {appliedStore
                ? `No visits found for “${appliedStore}”.`
                : "No market visit store rows recorded yet."}
            </div>
          ) : (
            <>
              <MarketVisitGrid
                title="Availability YES / NO"
                rows={report.rows}
                readOnly
                reportView
                mode="availability"
                openAlertsByStoreKey={report.openAlertsByStoreKey}
                visitMeta={report.rows.map((row) => ({
                  visitId: row.visitId,
                  visitDate: row.visitDate,
                  repName: row.repName,
                }))}
              />

              <MarketVisitGrid
                title="FACING DISPLAY IN UNIT"
                rows={report.rows}
                readOnly
                reportView
                mode="facing"
                visitMeta={report.rows.map((row) => ({
                  visitId: row.visitId,
                  visitDate: row.visitDate,
                  repName: row.repName,
                }))}
              />
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
