"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type StockProduct = {
  productCode: string;
  productName: string;
  onHandBottles: number;
  openingBalanceSetAt: string | null;
};

type BatchLot = {
  id: string;
  batchNo: string;
  productCode: string;
  productName: string;
  bottles: number;
  nimraLinked: boolean;
  batchProductName: string;
  note: string;
};

type Props = {
  readOnly?: boolean;
  catalog: Array<{ code: string; name: string }>;
  batchOptions: Array<{ batchNo: string; productName: string }>;
  refreshKey?: number;
};

export function ReadyBottleStockPanel({ readOnly, catalog, batchOptions, refreshKey }: Props) {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [batchLots, setBatchLots] = useState<BatchLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lotBatchNo, setLotBatchNo] = useState("");
  const [lotProductCode, setLotProductCode] = useState("");
  const [lotBottles, setLotBottles] = useState("");
  const [lotNote, setLotNote] = useState("Pre-filled before software / already on shelf");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ready-bottle-stock", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        products?: StockProduct[];
        batchLots?: BatchLot[];
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to load ready stock");
        return;
      }
      setProducts(data.products ?? []);
      setBatchLots(data.batchLots ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function addLot(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    const bottles = Number(lotBottles);
    if (!lotBatchNo.trim() || !lotProductCode || !Number.isInteger(bottles) || bottles < 1) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/ready-bottle-stock/lots", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          batchNo: lotBatchNo.trim(),
          productCode: lotProductCode,
          bottles,
          note: lotNote.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setSuccess(data.message ?? "Ready stock saved.");
      setLotBottles("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  const totalOnHand = products.reduce((s, p) => s + p.onHandBottles, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Ready bottle stock (production floor)</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Finished bottles capped, labeled, and packed — ready for dispatch. Enter any{" "}
            <strong>batch label + product + bottles</strong> — the batch does <strong>not</strong> need to exist in
            QC (use old batch numbers when liquid is gone). Suggestions from QC batches are optional. Daily filling{" "}
            <strong>Ready to deliver</strong> also adds here. Zaman <strong>Mark delivered</strong> deducts bottles
            and packaging together. Do not create 0-liter dummy batches in QC for shelf stock.
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold text-zinc-900">{totalOnHand} bottles total</div>
          <Link href="/dispatch/ready-stock/movements" className="text-xs font-medium text-zinc-700 underline">
            View movements
          </Link>
        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-emerald-800">{success}</p> : null}

      {!readOnly ? (
        <form onSubmit={addLot} className="mt-4 grid gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">Batch label (any number)</label>
            <input
              list="ready-stock-batches"
              value={lotBatchNo}
              onChange={(e) => setLotBatchNo(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
              placeholder="e.g. OLD-B-99 or B-2401"
            />
            <datalist id="ready-stock-batches">
              {batchOptions.map((b) => (
                <option key={b.batchNo} value={b.batchNo}>
                  {b.productName}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">Product</label>
            <select
              value={lotProductCode}
              onChange={(e) => setLotProductCode(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">Select…</option>
              {catalog.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">Bottles already filled</label>
            <input
              inputMode="numeric"
              value={lotBottles}
              onChange={(e) => setLotBottles(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
              placeholder="e.g. 200"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-[11px] font-medium text-zinc-600">Note</label>
            <input
              value={lotNote}
              onChange={(e) => setLotNote(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add ready stock"}
            </button>
          </div>
        </form>
      ) : null}

      {batchLots.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <div className="text-xs font-medium text-zinc-700">By batch (pre-filled / legacy)</div>
          <table className="mt-1 w-full min-w-[28rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-1 pr-2">Batch</th>
                <th className="py-1 pr-2">QC</th>
                <th className="py-1 pr-2">Product</th>
                <th className="py-1 pr-2 text-right">Bottles</th>
                <th className="py-1">Note</th>
              </tr>
            </thead>
            <tbody>
              {batchLots.map((lot) => (
                <tr key={lot.id} className="border-b border-zinc-100">
                  <td className="py-1 pr-2 font-medium">{lot.batchNo}</td>
                  <td className="py-1 pr-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        lot.nimraLinked
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {lot.nimraLinked ? "In QC" : "Legacy"}
                    </span>
                  </td>
                  <td className="py-1 pr-2">{lot.productName}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{lot.bottles}</td>
                  <td className="py-1 text-zinc-600">{lot.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <div className="text-xs font-medium text-zinc-700">On hand by product</div>
        {loading ? (
          <p className="mt-1 text-xs text-zinc-500">Loading…</p>
        ) : (
          <table className="mt-1 w-full min-w-[20rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-1 pr-2">Product</th>
                <th className="py-1 text-right">On hand (bottles)</th>
              </tr>
            </thead>
            <tbody>
              {products
                .filter((p) => p.onHandBottles > 0 || batchLots.some((l) => l.productCode === p.productCode))
                .map((p) => (
                  <tr key={p.productCode} className="border-b border-zinc-100">
                    <td className="py-1 pr-2">{p.productName}</td>
                    <td
                      className={`py-1 text-right tabular-nums font-medium ${
                        p.onHandBottles === 0 ? "text-amber-800" : "text-zinc-900"
                      }`}
                    >
                      {p.onHandBottles}
                    </td>
                  </tr>
                ))}
              {products.every((p) => p.onHandBottles === 0) && batchLots.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-2 text-zinc-500">
                    No ready stock yet — add pre-filled bottles above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
