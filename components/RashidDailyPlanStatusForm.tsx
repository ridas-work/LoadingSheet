"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { SerializedRashidDailyPlan } from "@/lib/rashidDailyPlan";
import { computeLineMetrics } from "@/lib/rashidDailyPlan";
import { ui } from "@/lib/ui";

type StatusRow = {
  lineKey: string;
  employeeName: string;
  duty: string;
  effectiveTarget: number;
  statusAchieved: string;
  carryOut: number;
};

type Props = {
  planDate: string;
  apiBase?: string;
  redirectBase?: string;
  showAdminLinks?: boolean;
};

export function RashidDailyPlanStatusForm({
  planDate,
  apiBase = "/api/admin/rashid-daily-plan",
  redirectBase = "/admin/rashid-daily-plan",
  showAdminLinks = true,
}: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<SerializedRashidDailyPlan | null>(null);
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${apiBase}?date=${encodeURIComponent(planDate)}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        plan?: SerializedRashidDailyPlan;
        saved?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setErrors({ form: data.error ?? "Could not load plan." });
        return;
      }
      if (!data.saved || !data.plan) {
        setErrors({
          form: showAdminLinks
            ? "Save the morning plan first, then come back here at end of day."
            : "Waiting for Waleed to save today's morning plan.",
        });
        return;
      }
      setPlan(data.plan);
      setRows(
        data.plan.workRows.map((r) => ({
          lineKey: r.lineKey,
          employeeName: r.employeeName,
          duty: r.duty,
          effectiveTarget: r.effectiveTarget,
          statusAchieved: String(r.statusAchieved),
          carryOut: r.carryOut,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [apiBase, planDate, showAdminLinks]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateStatus(index: number, value: string) {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[index], statusAchieved: value };
      const status = Math.max(0, Math.round(Number(value) || 0));
      const { carryOut } = computeLineMetrics(row.effectiveTarget, 0, status);
      row.carryOut = carryOut;
      next[index] = row;
      return next;
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage("");
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: planDate,
          statusRows: rows.map((r) => ({
            lineKey: r.lineKey,
            statusAchieved: Number(r.statusAchieved) || 0,
          })),
        }),
      });
      const data = (await res.json()) as {
        redirectTo?: string;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        setErrors(data.errors ?? { form: data.error ?? "Could not save status." });
        return;
      }
      router.push(data.redirectTo ?? `${redirectBase}/${planDate}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-zinc-600">Loading plan…</p>;

  if (errors.form && !plan) {
    return (
      <div className={`${ui.card} space-y-3 p-4`}>
        <p className="text-sm text-red-700">{errors.form}</p>
        {showAdminLinks ? (
          <Link href={`/admin/rashid-daily-plan/new?date=${planDate}`} className={ui.btnPrimary}>
            Create morning plan
          </Link>
        ) : (
          <Link href={redirectBase} className={ui.btnSecondarySm}>
            Back to daily plan
          </Link>
        )}
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={onSave}>
      {plan ? (
        <div className={`${ui.cardVisible} grid gap-4 p-4 sm:grid-cols-2`}>
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-500">Date</div>
            <div className="mt-1 text-sm font-medium">{plan.planDate}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-500">Helpers</div>
            <div className="mt-1 text-sm font-medium">{plan.helperName || "—"}</div>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-zinc-600">
        Enter what each person achieved today. Carry forward = effective target minus status (e.g.
        target 1000, status 700 → 300 carries to tomorrow).
      </p>

      <div className={`${ui.cardVisible} overflow-x-auto p-0`}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="border-b border-zinc-200 px-2 py-2">Name</th>
              <th className="border-b border-zinc-200 px-2 py-2">Duty</th>
              <th className="border-b border-zinc-200 px-2 py-2 text-right">Effective target</th>
              <th className="border-b border-zinc-200 px-2 py-2 text-right">Status achieved</th>
              <th className="border-b border-zinc-200 px-2 py-2 text-right">Carry forward</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.lineKey} className="border-b border-zinc-100">
                <td className="px-2 py-2">{row.employeeName}</td>
                <td className="px-2 py-2">{row.duty}</td>
                <td className="px-2 py-2 text-right tabular-nums font-medium">{row.effectiveTarget}</td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    value={row.statusAchieved}
                    onChange={(e) => updateStatus(index, e.target.value)}
                    className="w-24 rounded border border-zinc-200 px-2 py-1 text-right text-sm"
                  />
                </td>
                <td
                  className={`px-2 py-2 text-right tabular-nums font-semibold ${
                    row.carryOut > 0 ? "text-amber-800" : "text-zinc-700"
                  }`}
                >
                  {row.carryOut}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors.form ? <p className="text-sm text-red-700">{errors.form}</p> : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className={ui.btnPrimary}>
          {saving ? "Saving…" : "Save status & carry forward"}
        </button>
        <Link href={`${redirectBase}/${planDate}`} className={ui.btnGhost}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
