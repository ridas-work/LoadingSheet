"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { RashidDailyPlanListItem, SerializedRashidDailyPlan } from "@/lib/rashidDailyPlan";
import { todayPlanDateIso } from "@/lib/rashidDailyPlan";
import { ui } from "@/lib/ui";

export function RashidDailyPlanDispatchList() {
  const [plans, setPlans] = useState<RashidDailyPlanListItem[]>([]);
  const [todayPlan, setTodayPlan] = useState<SerializedRashidDailyPlan | null>(null);
  const [todaySaved, setTodaySaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = todayPlanDateIso();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, todayRes] = await Promise.all([
        fetch("/api/dispatch/daily-plan?list=1", { credentials: "same-origin" }),
        fetch(`/api/dispatch/daily-plan?date=${encodeURIComponent(today)}`, {
          credentials: "same-origin",
        }),
      ]);
      const listData = (await listRes.json()) as {
        plans?: RashidDailyPlanListItem[];
        error?: string;
      };
      const todayData = (await todayRes.json()) as {
        plan?: SerializedRashidDailyPlan;
        saved?: boolean;
        error?: string;
      };
      if (!listRes.ok) {
        setError(listData.error ?? "Could not load plans.");
        return;
      }
      setPlans(listData.plans ?? []);
      if (todayRes.ok) {
        setTodayPlan(todayData.plan ?? null);
        setTodaySaved(Boolean(todayData.saved));
      }
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayStatus = todaySaved ? todayPlan?.dayStatus : null;

  return (
    <div className="space-y-6">
      <div className={`${ui.cardVisible} space-y-3 p-4`}>
        <h2 className="text-sm font-semibold text-zinc-900">Today — {today}</h2>
        {loading ? (
          <p className="text-sm text-zinc-600">Loading…</p>
        ) : !todaySaved ? (
          <p className="text-sm text-zinc-700">
            Waiting for Waleed to save today&apos;s morning plan.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-700">
              Helpers: <strong>{todayPlan?.helperName || "—"}</strong>
            </span>
            {todayStatus === "closed" ? (
              <span className={ui.badgeSuccess}>Day closed</span>
            ) : (
              <span className={ui.badgeWarning}>Status pending</span>
            )}
            <Link href={`/dispatch/daily-plan/${today}`} className={ui.btnSecondarySm}>
              View plan
            </Link>
            {todayStatus !== "closed" ? (
              <Link href={`/dispatch/daily-plan/${today}/status`} className={ui.btnPrimarySm}>
                Record end-of-day status
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <div className={`${ui.card} overflow-x-auto p-0`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="border-b border-zinc-200 px-3 py-2">Date</th>
                <th className="border-b border-zinc-200 px-3 py-2">Helpers</th>
                <th className="border-b border-zinc-200 px-3 py-2">Rows</th>
                <th className="border-b border-zinc-200 px-3 py-2">Status</th>
                <th className="border-b border-zinc-200 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    No plans yet. Waleed creates the morning plan from Admin → Rashid plan.
                  </td>
                </tr>
              ) : (
                plans.map((p) => {
                  const isToday = p.planDate === today;
                  const pending = p.dayStatus === "planned";
                  return (
                    <tr
                      key={p.planDate}
                      className={`border-b border-zinc-100 ${isToday && pending ? "bg-amber-50/60" : ""}`}
                    >
                      <td className="px-3 py-2 font-medium tabular-nums">
                        {p.planDate}
                        {isToday ? (
                          <span className="ml-2 text-xs font-normal text-zinc-500">(today)</span>
                        ) : null}
                      </td>
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
                          href={`/dispatch/daily-plan/${p.planDate}`}
                          className="text-teal-800 hover:underline"
                        >
                          Open
                        </Link>
                        {pending ? (
                          <>
                            {" · "}
                            <Link
                              href={`/dispatch/daily-plan/${p.planDate}/status`}
                              className="text-teal-800 hover:underline"
                            >
                              Record status
                            </Link>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
