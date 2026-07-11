"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AddPackagingItemModal } from "@/components/AddPackagingItemModal";
import { CATEGORY_LABELS, packagingBalance } from "@/lib/packagingInventory";

export type PackagingItemRow = {
  code: string;
  name: string;
  category?: string;
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
  name: string;
  purchasedQty: string;
  rejectedDamage: string;
  uip: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function fmt(n: number) {
  return n.toLocaleString();
}

function rowStateFromItem(item: PackagingItemRow): RowState {
  return {
    name: item.name,
    purchasedQty: String(item.purchasedQty),
    rejectedDamage: String(item.rejectedDamage),
    uip: String(item.uip),
  };
}

function balancePreview(purchased: string, rejected: string, uip: string): number | null {
  const p = Number(purchased);
  const r = Number(rejected);
  const u = Number(uip);
  if (![p, r, u].every((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0)) {
    return null;
  }
  return packagingBalance({ purchasedQty: p, rejectedDamage: r, uip: u });
}

function statesEqual(a: RowState, b: RowState) {
  return (
    a.name === b.name &&
    a.purchasedQty === b.purchasedQty &&
    a.rejectedDamage === b.rejectedDamage &&
    a.uip === b.uip
  );
}

const inputClass =
  "w-full min-w-[4.5rem] rounded border border-zinc-200 bg-white px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300";

function matchesSearch(item: PackagingItemRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const category = (item.category ?? "").toLowerCase();
  const categoryLabel = (CATEGORY_LABELS[category] ?? category).toLowerCase();
  return (
    item.name.toLowerCase().includes(q) ||
    item.code.toLowerCase().includes(q) ||
    category.includes(q) ||
    categoryLabel.includes(q)
  );
}

export function PackagingInventoryGrid({ items, readOnly }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saved, setSaved] = useState<Record<string, RowState>>({});
  const [status, setStatus] = useState<Record<string, SaveStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredItems = useMemo(
    () => items.filter((item) => matchesSearch(item, search)),
    [items, search],
  );

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

      const name = current.name.trim();
      if (!name) {
        setStatus((s) => ({ ...s, [code]: "error" }));
        setErrors((e) => ({ ...e, [code]: "Name is required" }));
        return;
      }

      const p = Number(current.purchasedQty);
      const r = Number(current.rejectedDamage);
      const u = Number(current.uip);
      if (![p, r, u].every((n) => Number.isInteger(n) && n >= 0)) {
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
          name,
          purchasedQty: p,
          rejectedDamage: r,
          uip: u,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus((s) => ({ ...s, [code]: "error" }));
        setErrors((e) => ({ ...e, [code]: data.error ?? "Save failed" }));
        return;
      }

      const data = (await res.json()) as {
        item: { name: string; purchasedQty: number; rejectedDamage: number; uip: number };
      };
      const synced: RowState = {
        name: data.item.name,
        purchasedQty: String(data.item.purchasedQty),
        rejectedDamage: String(data.item.rejectedDamage),
        uip: String(data.item.uip),
      };
      setRows((prev) => ({ ...prev, [code]: synced }));
      setSaved((prev) => ({ ...prev, [code]: synced }));
      setStatus((s) => ({ ...s, [code]: "saved" }));
      setTimeout(() => {
        setStatus((s) => (s[code] === "saved" ? { ...s, [code]: "idle" } : s));
      }, 1500);
      router.refresh();
    },
    [readOnly, rows, saved, router],
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
      <div className="space-y-3">
        {!readOnly ? <AddPackagingItemModal /> : null}
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No packaging items yet. Add a material manually or run{" "}
          <code className="text-xs">npm run seed:packaging</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!readOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AddPackagingItemModal />
          <p className="text-xs text-zinc-500">Click a material name to rename it.</p>
        </div>
      ) : null}
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Find material
        </label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or type (e.g. Brighten, bottle, 3 LTR)…"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
        />
        <p className="mt-2 text-xs text-zinc-500">
          Showing {filteredItems.length} of {items.length} materials
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No materials match your search.
        </p>
      ) : (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {!readOnly ? (
        <p className="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Enter <strong>Purchased</strong>, <strong>Rejected/Damage</strong>, and <strong>UIP</strong> (Used in
          Production). Balance = Purchased − Rejected − UIP. Filling and delivered orders can still add to UIP
          automatically.
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
            {filteredItems.map((item) => {
              const state = rows[item.code] ?? rowStateFromItem(item);
              const balance =
                balancePreview(state.purchasedQty, state.rejectedDamage, state.uip) ?? item.balance;
              const rowStatus = status[item.code] ?? "idle";
              const rowError = errors[item.code];

              return (
                <tr key={item.code} className="border-b border-zinc-100">
                  <td className="px-3 py-1.5">
                    {readOnly ? (
                      <div className="font-medium text-zinc-900">{item.name}</div>
                    ) : (
                      <input
                        type="text"
                        value={state.name}
                        onChange={(e) => updateField(item.code, "name", e.target.value)}
                        onBlur={() => saveRow(item.code)}
                        className="w-full min-w-[12rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-zinc-900 hover:border-zinc-200 focus:border-zinc-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-300"
                        title="Click to rename"
                      />
                    )}
                    <div className="text-[10px] text-zinc-400">{item.code}</div>
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
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inputClass}
                          value={state.uip}
                          onChange={(e) => updateField(item.code, "uip", e.target.value)}
                          onBlur={() => saveRow(item.code)}
                        />
                      </td>
                    </>
                  )}
                  <td
                    className={`px-3 py-1.5 text-right font-semibold tabular-nums ${
                      balance < 0 ? "text-red-700" : "text-zinc-900"
                    }`}
                  >
                    {balancePreview(state.purchasedQty, state.rejectedDamage, state.uip) === null &&
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
      )}
    </div>
  );
}
