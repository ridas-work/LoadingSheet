"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { RashidDailyPlanListItem } from "@/lib/rashidDailyPlan";
import { todayPlanDateIso } from "@/lib/rashidDailyPlan";
import { ui } from "@/lib/ui";

export function RashidDailyPlanList() {
  const [plans, setPlans] = useState<RashidDailyPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rashid-daily-plan?list=1", { credentials: "same-origin" });
      const data = (await res.json()) as { plans?: RashidDailyPlanListItem[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load plans.");
        return;
      }
      setPlans(data.plans ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayPlanDateIso();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/admin/rashid-daily-plan/create?date=${today}`} className={ui.btnPrimary}>
          New plan for today
        </Link>
        <Link href={`/admin/rashid-daily-plan/create`} className={ui.btnSecondary}>
          New plan (pick date)
        </Link>
      </div>

      {loading ? <p className="text-sm text-zinc-600">Loading plans…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <div className={`${ui.card} overflow-x-auto p-0`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="border-b border-zinc-200 px-3 py-2">Date</th>
                <th className="border-b border-zinc-200 px-3 py-2">Helper</th>
                <th className="border-b border-zinc-200 px-3 py-2">Rows</th>
                <th className="border-b border-zinc-200 px-3 py-2">Status</th>
                <th className="border-b border-zinc-200 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    No plans saved yet. Start with &ldquo;New plan for today&rdquo;.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.planDate} className="border-b border-zinc-100">
                    <td className="px-3 py-2 font-medium tabular-nums">{p.planDate}</td>
                    <td className="px-3 py-2">{p.helperName || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{p.rowCount}</td>
                    <td className="px-3 py-2">
                      {p.dayStatus === "closed" ? (
                        <span className={ui.badgeSuccess}>Closed</span>
                      ) : (
                        <span className={ui.badgeWarning}>Planned</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/rashid-daily-plan/${p.planDate}`}
                        className="text-teal-800 hover:underline"
                      >
                        Open
                      </Link>
                      {p.dayStatus === "planned" ? (
                        <>
                          {" · "}
                          <Link
                            href={`/admin/rashid-daily-plan/${p.planDate}/status`}
                            className="text-teal-800 hover:underline"
                          >
                            Record status
                          </Link>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
