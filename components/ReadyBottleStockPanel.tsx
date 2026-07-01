"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  groupReadyStockLotsForDisplay,
  type ReadyStockDisplayRow,
} from "@/lib/readyStockBundleDisplay";

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
  bundleCode?: string;
  bundleSetId?: string;
  createdAt?: string | null;
};

type BundleComponent = {
  code: string;
  name: string;
  bottlesPerUnit: number;
};

type CatalogItem = {
  code: string;
  name: string;
  bundleComponents?: BundleComponent[];
};

type Props = {
  readOnly?: boolean;
  catalog: CatalogItem[];
  batchOptions: Array<{ batchNo: string; productName: string }>;
  refreshKey?: number;
  hideTitle?: boolean;
};

function isMultiProductBundle(item: CatalogItem | undefined): item is CatalogItem & { bundleComponents: BundleComponent[] } {
  if (!item?.bundleComponents?.length) return false;
  const distinctCodes = new Set(item.bundleComponents.map((c) => c.code.trim().toLowerCase()));
  return distinctCodes.size >= 2;
}

function readyStockRowMatchesFilter(row: ReadyStockDisplayRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (row.kind === "bundle") {
    if (row.bundleName.toLowerCase().includes(q)) return true;
    const batchLabel = row.components.map((c) => c.batchNo).join(" / ");
    if (batchLabel.toLowerCase().includes(q)) return true;
    return row.components.some(
      (c) => c.productName.toLowerCase().includes(q) || c.batchNo.toLowerCase().includes(q),
    );
  }

  return (
    row.lot.productName.toLowerCase().includes(q) || row.lot.batchNo.toLowerCase().includes(q)
  );
}

export function ReadyBottleStockPanel({ readOnly, catalog, batchOptions, refreshKey, hideTitle }: Props) {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [batchLots, setBatchLots] = useState<BatchLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lotBatchNo, setLotBatchNo] = useState("");
  const [lotComponentBatches, setLotComponentBatches] = useState<Record<string, string>>({});
  const [lotProductCode, setLotProductCode] = useState("");
  const [lotBottles, setLotBottles] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editingBundleKey, setEditingBundleKey] = useState<string | null>(null);
  const [editBottles, setEditBottles] = useState("");
  const [rowSaving, setRowSaving] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [tableFilter, setTableFilter] = useState("");

  const selectedProduct = useMemo(
    () => catalog.find((p) => p.code === lotProductCode),
    [catalog, lotProductCode],
  );
  const bundleMode = isMultiProductBundle(selectedProduct);

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

  function onProductChange(code: string) {
    setLotProductCode(code);
    setLotBatchNo("");
    setLotComponentBatches({});
  }

  async function postLot(args: {
    batchNo: string;
    productCode: string;
    bottles: number;
    note?: string;
    bundleCode?: string;
    bundleSetId?: string;
  }): Promise<{ error?: string; message?: string }> {
    const res = await fetch("/api/ready-bottle-stock/lots", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!res.ok) return { error: data.error ?? "Could not save" };
    return { message: data.message };
  }

  async function addLot(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    const sets = Number(lotBottles);
    if (!lotProductCode || !Number.isInteger(sets) || sets < 1) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (bundleMode) {
        const parts = selectedProduct.bundleComponents;
        const bundleSetId = `bnd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        for (const part of parts) {
          const batchNo = (lotComponentBatches[part.code] ?? "").trim();
          if (!batchNo) {
            setError(`Enter a batch number for ${part.name}.`);
            return;
          }
        }

        const messages: string[] = [];
        for (const part of parts) {
          const batchNo = lotComponentBatches[part.code]!.trim();
          const bottles = sets * part.bottlesPerUnit;
          const result = await postLot({
            batchNo,
            productCode: part.code,
            bottles,
            bundleCode: selectedProduct.code,
            bundleSetId,
            note: `Bundle ready stock (${selectedProduct.name})`,
          });
          if (result.error) {
            setError(result.error);
            await load();
            return;
          }
          if (result.message) messages.push(`${part.name}: ${result.message}`);
        }

        setSuccess(
          messages[0] ??
            `Bundle saved — ${sets} set(s) for ${parts.map((p) => p.name).join(" + ")}.`,
        );
        setLotBottles("");
        setLotComponentBatches({});
      } else {
        const batchNo = lotBatchNo.trim();
        if (!batchNo) {
          setError("Batch number is required.");
          return;
        }

        const result = await postLot({
          batchNo,
          productCode: lotProductCode,
          bottles: sets,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSuccess(result.message ?? "Ready stock saved.");
        setLotBottles("");
      }

      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEditLot(lot: BatchLot, displayBottles?: number) {
    setEditingLotId(lot.id);
    setEditBottles(String(displayBottles ?? lot.bottles));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[lot.id];
      return next;
    });
  }

  function cancelEditLot() {
    setEditingLotId(null);
    setEditingBundleKey(null);
    setEditBottles("");
  }

  async function saveLot(lot: BatchLot, bundleReserved = 0) {
    const next = Number(editBottles);
    if (!Number.isInteger(next) || next < 0) {
      setRowErrors((prev) => ({ ...prev, [lot.id]: "Enter a whole number ≥ 0" }));
      return;
    }
    const totalBottles = next + bundleReserved;
    if (totalBottles === lot.bottles) {
      cancelEditLot();
      return;
    }

    setRowSaving(lot.id);
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[lot.id];
      return copy;
    });

    try {
      const result = await postLot({
        batchNo: lot.batchNo,
        productCode: lot.productCode,
        bottles: totalBottles,
        note: lot.note,
        bundleCode: lot.bundleCode,
        bundleSetId: lot.bundleSetId,
      });
      if (result.error) {
        setRowErrors((prev) => ({ ...prev, [lot.id]: result.error ?? "Save failed" }));
        return;
      }
      setSuccess(
        result.message ??
          `${lot.productName} (${lot.batchNo}) updated to ${totalBottles} bottles.`,
      );
      cancelEditLot();
      await load();
    } finally {
      setRowSaving(null);
    }
  }

  async function saveBundleRow(row: Extract<ReadyStockDisplayRow, { kind: "bundle" }>) {
    const rowKey = row.bundleSetId;
    const nextSets = Number(editBottles);
    if (!Number.isInteger(nextSets) || nextSets < 0) {
      setRowErrors((prev) => ({ ...prev, [rowKey]: "Enter a whole number ≥ 0" }));
      return;
    }
    if (nextSets === row.bundleSets) {
      cancelEditLot();
      return;
    }

    setRowSaving(rowKey);
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[rowKey];
      return copy;
    });

    try {
      for (const comp of row.components) {
        const lot = batchLots.find((l) => l.id === comp.lotId);
        if (!lot) continue;
        const result = await postLot({
          batchNo: comp.batchNo,
          productCode: comp.productCode,
          bottles: nextSets * comp.bottlesPerUnit + Math.max(0, lot.bottles - comp.bottlesUsed),
          note: lot.note,
          bundleCode: row.bundleCode,
          bundleSetId: row.bundleSetId,
        });
        if (result.error) {
          setRowErrors((prev) => ({ ...prev, [rowKey]: result.error ?? "Save failed" }));
          await load();
          return;
        }
      }
      setSuccess(`${row.bundleName}: ${nextSets} bundle set(s) on shelf.`);
      cancelEditLot();
      await load();
    } finally {
      setRowSaving(null);
    }
  }

  const visibleLots = batchLots.filter((l) => l.bottles > 0);
  const displayRows = useMemo(
    () => groupReadyStockLotsForDisplay(visibleLots, catalog),
    [visibleLots, catalog],
  );
  const filteredDisplayRows = useMemo(() => {
    if (!tableFilter.trim()) return displayRows;
    return displayRows.filter((row) => readyStockRowMatchesFilter(row, tableFilter));
  }, [displayRows, tableFilter]);

  const totalOnHand = products.reduce((s, p) => s + p.onHandBottles, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {hideTitle ? (
          <p className="text-sm text-zinc-600">
            Batch label does <strong>not</strong> need to exist in QC — use old numbers when liquid is gone.
            Daily filling <strong>Ready to deliver</strong> also increases stock here. For{" "}
            <strong>bundles</strong>, enter one batch per product in the bundle.
          </p>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Ready bottle stock (production floor)</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Finished bottles capped, labeled, and packed — ready for dispatch. Enter{" "}
              <strong>batch label + product + bottles</strong>. For bundles, enter a batch for each product in the
              bundle. Daily filling <strong>Ready to deliver</strong> also adds here.
            </p>
          </div>
        )}
        <div className="text-right text-sm">
          <div className="font-semibold text-zinc-900">{totalOnHand} bottles total</div>
          {!hideTitle ? (
            <Link href="/dispatch/ready-stock/movements" className="text-xs font-medium text-zinc-700 underline">
              View movements
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-emerald-800">{success}</p> : null}

      {!readOnly ? (
        <form
          onSubmit={addLot}
          className="mt-4 space-y-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className={bundleMode ? "sm:col-span-2 lg:col-span-3" : ""}>
              <label className="block text-[11px] font-medium text-zinc-600">Product</label>
              <select
                value={lotProductCode}
                onChange={(e) => onProductChange(e.target.value)}
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

            {bundleMode ? (
              <>
                <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
                  <strong>Bundle:</strong> enter a batch number for each product below, then how many complete
                  bundle sets are on the shelf.
                </div>
                {selectedProduct.bundleComponents.map((part) => (
                  <div key={part.code}>
                    <label className="block text-[11px] font-medium text-zinc-600">
                      Batch — {part.name}
                    </label>
                    <input
                      list="ready-stock-batches"
                      value={lotComponentBatches[part.code] ?? ""}
                      onChange={(e) =>
                        setLotComponentBatches((prev) => ({ ...prev, [part.code]: e.target.value }))
                      }
                      className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      placeholder="e.g. 260522"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600">
                    Complete bundle sets on shelf
                  </label>
                  <input
                    inputMode="numeric"
                    value={lotBottles}
                    onChange={(e) => setLotBottles(e.target.value)}
                    className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
                    placeholder="e.g. 50"
                  />
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    Each set adds {selectedProduct.bundleComponents.map((p) => p.bottlesPerUnit).join(" + ")}{" "}
                    bottle(s) per product.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600">Batch label (any number)</label>
                  <input
                    list="ready-stock-batches"
                    value={lotBatchNo}
                    onChange={(e) => setLotBatchNo(e.target.value)}
                    className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
                    placeholder="e.g. OLD-B-99 or B-2401"
                  />
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
              </>
            )}
          </div>

          <datalist id="ready-stock-batches">
            {batchOptions.map((b) => (
              <option key={b.batchNo} value={b.batchNo}>
                {b.productName}
              </option>
            ))}
          </datalist>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : bundleMode ? "Add bundle ready stock" : "Add ready stock"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-zinc-700">On hand by batch</div>
            {!readOnly ? (
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Each row is one batch label on the shelf. Click <strong>Edit</strong> to update bottle counts.
              </p>
            ) : null}
          </div>
          <div className="w-full sm:w-auto sm:min-w-[14rem]">
            <label className="block text-[11px] font-medium text-zinc-600" htmlFor="ready-stock-filter">
              Filter by product or batch
            </label>
            <input
              id="ready-stock-filter"
              type="search"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="e.g. Rhino or 260522"
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        {tableFilter.trim() ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            Showing {filteredDisplayRows.length} of {displayRows.length} row
            {displayRows.length === 1 ? "" : "s"}
          </p>
        ) : null}
        {loading ? (
          <p className="mt-1 text-xs text-zinc-500">Loading…</p>
        ) : (
          <table className="mt-1 w-full min-w-[28rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-1 pr-2">Product</th>
                <th className="py-1 pr-2">Batch no.</th>
                <th className="py-1 text-right">On hand</th>
                {!readOnly ? <th className="w-16 py-1 text-right"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredDisplayRows.map((row) => {
                if (row.kind === "bundle") {
                  const rowKey = row.bundleSetId;
                  const isEditing = editingBundleKey === rowKey;
                  const rowError = rowErrors[rowKey];
                  const isSaving = rowSaving === rowKey;
                  const batchLabel = row.components.map((c) => c.batchNo).join(" / ");

                  return (
                    <tr key={`bundle-${rowKey}`} className="border-b border-zinc-100 align-top">
                      <td className="py-1 pr-2">
                        <div className="font-medium text-zinc-900">{row.bundleName}</div>
                        {rowError ? <div className="text-[10px] text-red-600">{rowError}</div> : null}
                      </td>
                      <td className="py-1 pr-2 font-medium tabular-nums text-zinc-800">{batchLabel}</td>
                      <td className="py-1 text-right tabular-nums">
                        {isEditing ? (
                          <input
                            inputMode="numeric"
                            value={editBottles}
                            onChange={(e) => setEditBottles(e.target.value)}
                            className="w-full min-w-[5rem] rounded border border-zinc-200 px-2 py-1 text-right text-xs"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-zinc-900">{row.bundleSets} sets</span>
                        )}
                      </td>
                      {!readOnly ? (
                        <td className="py-1 text-right">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => void saveBundleRow(row)}
                                className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white disabled:opacity-50"
                              >
                                {isSaving ? "…" : "Save"}
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={cancelEditLot}
                                className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBundleKey(rowKey);
                                setEditingLotId(null);
                                setEditBottles(String(row.bundleSets));
                              }}
                              className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                }

                const lot = row.lot;
                const fullLot = batchLots.find((l) => l.id === lot.id);
                if (!fullLot) return null;
                const bundleReserved = fullLot.bottles - row.bottlesOnHand;
                const isEditing = editingLotId === lot.id;
                const rowError = rowErrors[lot.id];
                const isSaving = rowSaving === lot.id;

                return (
                  <tr key={lot.id} className="border-b border-zinc-100 align-top">
                    <td className="py-1 pr-2">
                      <div>{lot.productName}</div>
                      {bundleReserved > 0 ? (
                        <div className="text-[10px] text-zinc-500">
                          {bundleReserved} bottles reserved for bundles above
                        </div>
                      ) : null}
                      {rowError ? <div className="text-[10px] text-red-600">{rowError}</div> : null}
                    </td>
                    <td className="py-1 pr-2 font-medium tabular-nums text-zinc-800">{lot.batchNo}</td>
                    <td className="py-1 text-right tabular-nums">
                      {isEditing ? (
                        <input
                          inputMode="numeric"
                          value={editBottles}
                          onChange={(e) => setEditBottles(e.target.value)}
                          className="w-full min-w-[5rem] rounded border border-zinc-200 px-2 py-1 text-right text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-zinc-900">{row.bottlesOnHand}</span>
                      )}
                    </td>
                    {!readOnly ? (
                      <td className="py-1 text-right">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => saveLot(fullLot, bundleReserved)}
                              className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white disabled:opacity-50"
                            >
                              {isSaving ? "…" : "Save"}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={cancelEditLot}
                              className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                              onClick={() => {
                                startEditLot(fullLot, row.bottlesOnHand);
                                setEditingBundleKey(null);
                              }}
                            className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {filteredDisplayRows.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 3 : 4} className="py-2 text-zinc-500">
                    {displayRows.length === 0
                      ? "No ready stock yet — add pre-filled bottles above (batch + product + count)."
                      : `No rows match “${tableFilter.trim()}”.`}
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
