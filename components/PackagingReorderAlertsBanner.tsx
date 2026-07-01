"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PackagingReorderReport } from "@/lib/packagingReorderAlerts.types";
import { ui } from "@/lib/ui";

export function PackagingReorderAlertsBanner() {
  const [report, setReport] = useState<PackagingReorderReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/packaging-alerts");
        if (!res.ok) {
          if (res.status === 403) return;
          throw new Error("Could not load packaging alerts");
        }
        const data = (await res.json()) as PackagingReorderReport;
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load alerts");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error || !report || report.summary.total === 0) return null;

  const { critical, total } = report.summary;
  const alertClass = critical > 0 ? ui.alertDanger : ui.alertWarning;

  return (
    <div className={`${alertClass} mx-4 print:hidden`}>
      <p className="text-sm font-medium">
        {total} packaging item{total === 1 ? "" : "s"} below minimum stock
        {critical > 0 ? ` (${critical} critical)` : ""} — re-order for continuity.
      </p>
      <Link href="/admin/packaging-alerts" className="mt-1 inline-block text-sm font-medium underline">
        View packaging alerts
      </Link>
    </div>
  );
}
