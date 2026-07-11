"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { formatDisplayDate } from "@/lib/dateOnly";
import type { PackagingDailySnapshot, PackagingHistoryEntry } from "@/lib/packagingHistory";
import { CATEGORY_LABELS, PACKAGING_CATEGORIES } from "@/lib/packagingInventory";
import { ui } from "@/lib/ui";

type HistoryResponse = {
  view: "changes" | "daily";
  from: string;
  to: string;
  entries: PackagingHistoryEntry[];
  snapshots: PackagingDailySnapshot[];
};

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function formatDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return formatDisplayDate(new Date(y, m - 1, d));
}

function changeClass(change: number): string {
  if (change > 0) return "text-emerald-700";
  if (change < 0) return "text-red-700";
  return "text-zinc-600";
}

type Props = {
  accentEsha?: boolean;
};

export function PackagingInventoryHistory({ accentEsha }: Props) {
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("bottle");
  const [view, setView] = useState<"changes" | "daily">("changes");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from, to, view });
    if (category) params.set("category", category);
    if (q.trim()) params.set("q", q.trim());

    const res = await fetch(`/api/packaging-history?${params.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as HistoryResponse & { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Could not load packaging history.");
      setData(null);
      return;
    }
    setData(body);
  }, [from, to, view, category, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    return view === "daily" ? data.snapshots : data.entries;
  }, [data, view]);

  const header = accentEsha ? (
    <PageHeader
      accent="esha"
      title="Packaging stock history"
      description="Date-wise record of packaging balance — see how many bottles (and other materials) you had on each day."
      backHref="/dispatch/inventory"
      backLabel="Back to inventory"
    />
  ) : (
    <div>
      <Link href="/dispatch/inventory" className="text-sm font-medium text-zinc-700 underline">
        ← Packaging inventory
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Packaging stock history</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Date-wise record of packaging balance — see how many units you had on each day.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {header}

      <div className={`${ui.card} flex flex-wrap items-end gap-4 p-4`}>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Type</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All materials</option>
            {PACKAGING_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat] ?? cat}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">View</span>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as "changes" | "daily")}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="changes">Days with changes only</option>
            <option value="daily">Every day (end-of-day balance)</option>
          </select>
        </label>
        <label className="min-w-[12rem] flex-1 text-sm text-zinc-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Material name or code"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button type="button" onClick={() => void load()} className={ui.btnPrimary}>
          Refresh
        </button>
      </div>

      <p className="text-xs text-zinc-600">
        {view === "changes"
          ? "Shows each day Esha (or the system) updated stock — balance is the count at end of that day."
          : "Shows end-of-day balance for every day in the range (skips items that were still zero and never updated)."}
      </p>

      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse border border-zinc-300 text-sm">
            <thead>
              <tr className="bg-zinc-100">
                <th className="border border-zinc-300 px-2 py-2 text-left">Date</th>
                <th className="border border-zinc-300 px-2 py-2 text-left">Material</th>
                <th className="border border-zinc-300 px-2 py-2 text-left">Type</th>
                <th className="border border-zinc-300 px-2 py-2 text-right">Balance</th>
                {view === "changes" ? (
                  <th className="border border-zinc-300 px-2 py-2 text-right">Change</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={view === "changes" ? 5 : 4}
                    className="border border-zinc-300 px-3 py-8 text-center text-zinc-500"
                  >
                    No packaging history in this date range.
                  </td>
                </tr>
              ) : view === "changes" ? (
                (data?.entries ?? []).map((row) => (
                  <tr key={`${row.date}-${row.itemCode}`} className="bg-white">
                    <td className="border border-zinc-300 px-2 py-2 whitespace-nowrap">
                      {formatDateKey(row.date)}
                    </td>
                    <td className="border border-zinc-300 px-2 py-2">
                      <div className="font-medium">{row.itemName}</div>
                      <div className="text-xs text-zinc-500">{row.itemCode}</div>
                    </td>
                    <td className="border border-zinc-300 px-2 py-2">{row.categoryLabel}</td>
                    <td className="border border-zinc-300 px-2 py-2 text-right tabular-nums font-medium">
                      {row.balance.toLocaleString()} {row.unit}
                    </td>
                    <td
                      className={`border border-zinc-300 px-2 py-2 text-right tabular-nums ${changeClass(row.change)}`}
                    >
                      {row.change > 0 ? "+" : ""}
                      {row.change.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                (data?.snapshots ?? []).map((row) => (
                  <tr key={`${row.date}-${row.itemCode}`} className="bg-white">
                    <td className="border border-zinc-300 px-2 py-2 whitespace-nowrap">
                      {formatDateKey(row.date)}
                    </td>
                    <td className="border border-zinc-300 px-2 py-2">
                      <div className="font-medium">{row.itemName}</div>
                      <div className="text-xs text-zinc-500">{row.itemCode}</div>
                    </td>
                    <td className="border border-zinc-300 px-2 py-2">{row.categoryLabel}</td>
                    <td className="border border-zinc-300 px-2 py-2 text-right tabular-nums font-medium">
                      {row.balance.toLocaleString()} {row.unit}
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
