"use client";

import { useEffect, useState } from "react";

import type { PackagingReorderAlert, PackagingReorderReport } from "@/lib/packagingReorderAlerts.types";
import { ui } from "@/lib/ui";

function severityBadge(alert: PackagingReorderAlert) {
  if (alert.missingFromInventory) {
    return <span className={ui.badgeDanger}>Missing</span>;
  }
  if (alert.severity === "critical") {
    return <span className={ui.badgeDanger}>Critical</span>;
  }
  return <span className={ui.badgeWarning}>Low</span>;
}

export function PackagingReorderAlertsPanel() {
  const [report, setReport] = useState<PackagingReorderReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/packaging-alerts");
        if (!res.ok) throw new Error(res.status === 403 ? "Access denied" : "Could not load alerts");
        const data = (await res.json()) as PackagingReorderReport;
        if (!cancelled) {
          setReport(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading packaging alerts…</p>;
  }

  if (error) {
    return <div className={ui.alertDanger}>{error}</div>;
  }

  if (!report || report.alerts.length === 0) {
    return (
      <div className={ui.alertSuccess}>
        All packaging stock is above minimum levels.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        {report.summary.total} item{report.summary.total === 1 ? "" : "s"} need re-ordering
        {report.summary.critical > 0
          ? ` (${report.summary.critical} critical, ${report.summary.warning} low)`
          : ""}
        . Checked {new Date(report.checkedAt).toLocaleString()}.
      </p>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Product / group</th>
              <th className="px-3 py-2 font-medium">Component</th>
              <th className="px-3 py-2 font-medium text-right">Balance</th>
              <th className="px-3 py-2 font-medium text-right">Minimum</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.alerts.map((alert) => (
              <tr
                key={`${alert.ruleId}-${alert.packagingItemCode}`}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2 font-medium text-zinc-800">{alert.label}</td>
                <td className="px-3 py-2 text-zinc-700">{alert.itemName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{alert.balance.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                  {alert.threshold.toLocaleString()}
                </td>
                <td className="px-3 py-2">{severityBadge(alert)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Stock is managed on Production → Packaging inventory (Esha).
      </p>
    </div>
  );
}
