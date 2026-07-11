"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SerializedRashidDailyPlan, WorkRowView } from "@/lib/rashidDailyPlan";
import type { RashidPlanProduct } from "@/lib/rashidPlanProducts";
import { todayPlanDateIso } from "@/lib/rashidDailyPlan";
import { ui } from "@/lib/ui";

const DUTY_LABELS = {
  boxMaking: "Box making",
  machineCleaning: "Machine cleaning",
  hallOrganization: "Hall organization / cleaning",
} as const;

type Props = {
  planDate: string;
  mode?: "admin" | "dispatch";
  apiBase?: string;
  redirectBase?: string;
};

function groupRows(rows: WorkRowView[], products: RashidPlanProduct[]) {
  const nameByCode = new Map(products.map((p) => [p.productCode, p.displayName]));
  const groups = new Map<string, WorkRowView[]>();

  for (const row of rows) {
    const key = row.productCode || "__other__";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([code, groupRows]) => ({
    title: code === "__other__" ? "Other duties" : (nameByCode.get(code) ?? code),
    rows: groupRows,
  }));
}

export function RashidDailyPlanView({
  planDate,
  mode = "admin",
  apiBase = mode === "dispatch" ? "/api/dispatch/daily-plan" : "/api/admin/rashid-daily-plan",
  redirectBase = mode === "dispatch" ? "/dispatch/daily-plan" : "/admin/rashid-daily-plan",
}: Props) {
  const isDispatch = mode === "dispatch";
  const [plan, setPlan] = useState<SerializedRashidDailyPlan | null>(null);
  const [products, setProducts] = useState<RashidPlanProduct[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [planRes, prodRes] = await Promise.all([
        fetch(`${apiBase}?date=${encodeURIComponent(planDate)}`, {
          credentials: "same-origin",
        }),
        fetch("/api/admin/rashid-daily-plan/products", {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);
      const data = (await planRes.json()) as {
        plan?: SerializedRashidDailyPlan;
        saved?: boolean;
        error?: string;
      };
      if (!planRes.ok) {
        setError(data.error ?? "Could not load plan.");
        return;
      }
      if (prodRes.ok) {
        const prodData = (await prodRes.json()) as { products?: RashidPlanProduct[] };
        setProducts(prodData.products ?? []);
      }
      setPlan(data.plan ?? null);
      setSaved(Boolean(data.saved));
    } finally {
      setLoading(false);
    }
  }, [apiBase, planDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(
    () => (plan ? groupRows(plan.workRows, products) : []),
    [plan, products],
  );

  if (loading) return <p className="text-sm text-zinc-600">Loading plan…</p>;
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!plan) return <p className="text-sm text-red-700">Plan not found.</p>;

  if (!saved) {
    return (
      <div className={`${ui.card} space-y-3 p-4`}>
        <p className="text-sm text-zinc-700">
          {isDispatch
            ? `No morning plan saved for ${planDate} yet. Waiting for Waleed to save today's plan.`
            : `No morning plan saved for ${planDate} yet.`}
        </p>
        {!isDispatch ? (
          <Link href={`/admin/rashid-daily-plan/create?date=${planDate}`} className={ui.btnPrimary}>
            Create morning plan
          </Link>
        ) : (
          <Link href={redirectBase} className={ui.btnGhost}>
            Back to daily plan
          </Link>
        )}
      </div>
    );
  }

  const isClosed = plan.dayStatus === "closed";
  const showCarryWarning =
    !isDispatch && plan.previousPlanDate && !plan.previousDayClosed;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {isClosed ? (
          <span className={ui.badgeSuccess}>Day closed</span>
        ) : (
          <span className={ui.badgeWarning}>Morning plan saved — status pending</span>
        )}
        {isDispatch ? (
          <>
            <Link href={`${redirectBase}/${planDate}/status`} className={ui.btnPrimarySm}>
              {isClosed ? "Update status" : "Record end-of-day status"}
            </Link>
            <Link href={redirectBase} className={ui.btnGhost}>
              All plans
            </Link>
          </>
        ) : !isClosed ? (
          <>
            <Link href={`${redirectBase}/${planDate}/edit`} className={ui.btnSecondarySm}>
              Edit morning plan
            </Link>
            <Link href={`${redirectBase}/${planDate}/status`} className={ui.btnPrimarySm}>
              Record end-of-day status
            </Link>
          </>
        ) : (
          <Link href={`${redirectBase}/${planDate}/status`} className={ui.btnSecondarySm}>
            Update status
          </Link>
        )}
      </div>

      {showCarryWarning ? (
        <p className={`${ui.alertWarning}`}>
          Yesterday&apos;s plan ({plan.previousPlanDate}) is not closed by Rashid yet — carry-in may
          be 0 until end-of-day status is recorded.
        </p>
      ) : null}

      <div className={`${ui.card} grid gap-4 p-4 sm:grid-cols-2`}>
        <div>
          <div className="text-xs font-semibold uppercase text-zinc-500">Date</div>
          <div className="mt-1 text-sm font-medium">{plan.planDate}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-zinc-500">Helpers of the day</div>
          <div className="mt-1 text-sm font-medium">{plan.helperName || "—"}</div>
        </div>
        {plan.recordedByName ? (
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-500">Plan saved by</div>
            <div className="mt-1 text-sm">{plan.recordedByName}</div>
          </div>
        ) : null}
        {isClosed && plan.statusRecordedByName ? (
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-500">Status recorded by</div>
            <div className="mt-1 text-sm">{plan.statusRecordedByName}</div>
          </div>
        ) : null}
      </div>

      {grouped.map((group) => (
        <div key={group.title} className={`${ui.card} overflow-x-auto p-0`}>
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800">
            {group.title}
          </div>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="border-b border-zinc-200 px-2 py-2">Name</th>
                <th className="border-b border-zinc-200 px-2 py-2">Task</th>
                <th className="border-b border-zinc-200 px-2 py-2 text-right">Target</th>
                <th className="border-b border-zinc-200 px-2 py-2 text-right">Carry in</th>
                <th className="border-b border-zinc-200 px-2 py-2 text-right">Effective</th>
                {isClosed ? (
                  <>
                    <th className="border-b border-zinc-200 px-2 py-2 text-right">Status</th>
                    <th className="border-b border-zinc-200 px-2 py-2 text-right">Carry forward</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.lineKey} className="border-b border-zinc-100">
                  <td className="px-2 py-2">{row.employeeName}</td>
                  <td className="px-2 py-2">{row.duty}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.baseTarget}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-zinc-600">{row.carryIn}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-medium">{row.effectiveTarget}</td>
                  {isClosed ? (
                    <>
                      <td className="px-2 py-2 text-right tabular-nums">{row.statusAchieved}</td>
                      <td
                        className={`px-2 py-2 text-right tabular-nums font-semibold ${
                          row.carryOut > 0 ? "text-amber-800" : "text-zinc-700"
                        }`}
                      >
                        {row.carryOut}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className={`${ui.card} space-y-4 p-4`}>
        <h2 className="text-sm font-semibold text-zinc-900">End-of-day duties</h2>
        {(Object.keys(DUTY_LABELS) as (keyof typeof DUTY_LABELS)[]).map((key) => (
          <div key={key}>
            <div className="text-sm font-medium text-zinc-800">{DUTY_LABELS[key]}</div>
            <div className="mt-1 text-sm text-zinc-700">
              {plan.duties[key].employeeNames || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { todayPlanDateIso };
