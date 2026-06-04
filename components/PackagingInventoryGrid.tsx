"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { packagingBalance } from "@/lib/packagingInventory";

export type PackagingItemRow = {
  code: string;
  name: string;
  unit: string;
  purchasedQty: number;
  rejectedDamage: number;
  uip: number;
  balance: number;
};

type Props = {
  items: PackagingItemRow[];
  readOnly?: boolean;
};

type RowState = {
  purchasedQty: string;
  rejectedDamage: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function fmt(n: number) {
  return n.toLocaleString();
}

function rowStateFromItem(item: PackagingItemRow): RowState {
  return {
    purchasedQty: String(item.purchasedQty),
    rejectedDamage: String(item.rejectedDamage),
  };
}

function balancePreview(purchased: string, rejected: string, uip: number): number | null {
  const p = Number(purchased);
  const r = Number(rejected);
  if (![p, r].every((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0)) {
    return null;
  }
  return packagingBalance({ purchasedQty: p, rejectedDamage: r, uip });
}

function statesEqual(a: RowState, b: RowState) {
  return a.purchasedQty === b.purchasedQty && a.rejectedDamage === b.rejectedDamage;
}

const inputClass =
  "w-full min-w-[4.5rem] rounded border border-zinc-200 bg-white px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300";

export function PackagingInventoryGrid({ items, readOnly }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saved, setSaved] = useState<Record<string, RowState>>({});
  const [status, setStatus] = useState<Record<string, SaveStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, RowState> = {};
    const nextSaved: Record<string, RowState> = {};
    for (const item of items) {
      const s = rowStateFromItem(item);
      next[item.code] = s;
      nextSaved[item.code] = s;
    }
    setRows(next);
    setSaved(nextSaved);
  }, [items]);

  const saveRow = useCallback(
    async (code: string) => {
      if (readOnly) return;

      const current = rows[code];
      const baseline = saved[code];
      if (!current || !baseline || statesEqual(current, baseline)) return;

      const p = Number(current.purchasedQty);
      const r = Number(current.rejectedDamage);
      if (![p, r].every((n) => Number.isInteger(n) && n >= 0)) {
        setStatus((s) => ({ ...s, [code]: "error" }));
        setErrors((e) => ({ ...e, [code]: "Whole numbers ≥ 0 only" }));
        return;
      }

      setStatus((s) => ({ ...s, [code]: "saving" }));
      setErrors((e) => {
        const next = { ...e };
        delete next[code];
        return next;
      });

      const res = await fetch(`/api/packaging-items/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasedQty: p,
          rejectedDamage: r,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus((s) => ({ ...s, [code]: "error" }));
        setErrors((e) => ({ ...e, [code]: data.error ?? "Save failed" }));
        return;
      }

      const data = (await res.json()) as {
        item: { purchasedQty: number; rejectedDamage: number; uip: number };
      };
      const synced: RowState = {
        purchasedQty: String(data.item.purchasedQty),
        rejectedDamage: String(data.item.rejectedDamage),
      };
      setRows((prev) => ({ ...prev, [code]: synced }));
      setSaved((prev) => ({ ...prev, [code]: synced }));
      setStatus((s) => ({ ...s, [code]: "saved" }));
      setTimeout(() => {
        setStatus((s) => (s[code] === "saved" ? { ...s, [code]: "idle" } : s));
      }, 1500);
      router.refresh();
    },
    [readOnly, rows, saved, router, items],
  );

  function updateField(code: string, field: keyof RowState, value: string) {
    setRows((prev) => ({
      ...prev,
      [code]: { ...prev[code]!, [field]: value },
    }));
    if (status[code] === "saved" || status[code] === "error") {
      setStatus((s) => ({ ...s, [code]: "idle" }));
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
        No packaging items in catalog. Run <code className="text-xs">npm run seed:packaging</code>.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {!readOnly ? (
        <p className="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Enter <strong>Purchased</strong> and <strong>Rejected/Damage</strong> only. UIP updates when Rashid fills
          bottles or Zaman marks an order delivered. Balance = Purchased − Rejected − UIP.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-600">
              <th className="min-w-[14rem] px-3 py-2.5 font-semibold text-zinc-800">Material Name</th>
              <th className="w-32 px-3 py-2.5 text-right font-semibold">Purchased Qty</th>
              <th className="w-36 px-3 py-2.5 text-right font-semibold">Rejected / Damage</th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold" title="Used in production">
                UIP
              </th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold text-zinc-900">Balance</th>
              {!readOnly ? <th className="w-20 px-2 py-2.5" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const state = rows[item.code] ?? rowStateFromItem(item);
              const balance = balancePreview(state.purchasedQty, state.rejectedDamage, item.uip) ?? item.balance;
              const rowStatus = status[item.code] ?? "idle";
              const rowError = errors[item.code];

              return (
                <tr key={item.code} className="border-b border-zinc-100">
                  <td className="px-3 py-1.5">
                    <div className="font-medium text-zinc-900">{item.name}</div>
                    {rowError ? (
                      <div className="text-[11px] text-red-600">{rowError}</div>
                    ) : null}
                  </td>
                  {readOnly ? (
                    <>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(item.purchasedQty)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(item.rejectedDamage)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(item.uip)}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inputClass}
                          value={state.purchasedQty}
                          onChange={(e) => updateField(item.code, "purchasedQty", e.target.value)}
                          onBlur={() => saveRow(item.code)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inputClass}
                          value={state.rejectedDamage}
                          onChange={(e) => updateField(item.code, "rejectedDamage", e.target.value)}
                          onBlur={() => saveRow(item.code)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-600">{fmt(item.uip)}</td>
                    </>
                  )}
                  <td
                    className={`px-3 py-1.5 text-right font-semibold tabular-nums ${
                      balance < 0 ? "text-red-700" : "text-zinc-900"
                    }`}
                  >
                    {balancePreview(state.purchasedQty, state.rejectedDamage, item.uip) === null &&
                    !readOnly
                      ? "—"
                      : fmt(balance)}
                  </td>
                  {!readOnly ? (
                    <td className="px-2 py-1.5 text-center text-[11px] text-zinc-500">
                      {rowStatus === "saving" ? "…" : rowStatus === "saved" ? "✓" : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
