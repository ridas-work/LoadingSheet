"use client";

import { useEffect, useState } from "react";

import type { DeliveryClosureLine } from "@/lib/gateDeliveryClosure";

type ProductOption = { productCode: string; productName: string };

type LineDraft = {
  productCode: string;
  productName: string;
  damagedBottles: number;
  returnedBottles: number;
};

type Props = {
  orderId: string;
  poNumber: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function GateLateReturnModal({ orderId, poNumber, open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [closureByProduct, setClosureByProduct] = useState<Record<string, DeliveryClosureLine>>({});
  const [lines, setLines] = useState<LineDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNote("");
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/gate-delivery`);
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          lateReturnProducts?: ProductOption[];
          catalogProducts?: ProductOption[];
          closure?: { lines?: DeliveryClosureLine[] };
        };
        if (!res.ok) {
          setError(data.error || "Could not load products.");
          setProducts([]);
          setLines([]);
          return;
        }
        const opts = data.catalogProducts ?? data.lateReturnProducts ?? [];
        setProducts(opts);

        const byProduct: Record<string, DeliveryClosureLine> = {};
        for (const line of data.closure?.lines ?? []) {
          byProduct[line.productCode] = line;
        }
        setClosureByProduct(byProduct);

        const poProducts = (data.closure?.lines ?? [])
          .filter((l) => l.dispatchedBottles > 0)
          .map((l) => ({
            productCode: l.productCode,
            productName: l.productName,
          }));
        setLines(
          poProducts.map((p) => ({
            productCode: p.productCode,
            productName: p.productName,
            damagedBottles: 0,
            returnedBottles: 0,
          })),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open, orderId]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addProduct(code: string) {
    const p = products.find((x) => x.productCode === code);
    if (!p || lines.some((l) => l.productCode === code)) return;
    setLines((prev) => [
      ...prev,
      { productCode: p.productCode, productName: p.productName, damagedBottles: 0, returnedBottles: 0 },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const active = lines.filter((l) => l.damagedBottles > 0 || l.returnedBottles > 0);
      if (active.length === 0) {
        setError("Enter at least one damaged or returned bottle.");
        setSubmitting(false);
        return;
      }
      const res = await fetch(`/api/orders/${orderId}/gate-delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_late_return",
          note,
          lines: active,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string>;
        returnedBottles?: number;
        damagedBottles?: number;
      };
      if (!res.ok) {
        setError(data.error || data.errors?.lines || "Could not record return.");
        return;
      }
      onSuccess(
        `Late return on ${poNumber} — ${data.returnedBottles ?? 0} good to Rashid stock, ${data.damagedBottles ?? 0} damaged.`,
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const unused = products.filter((p) => !lines.some((l) => l.productCode === p.productCode));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Late bottle return — {poNumber}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Record bottles that came back after this PO was closed — including products{' '}
          <strong>not on this order</strong> (e.g. Brighten from an older delivery). Counts are not
          limited to what was dispatched. Good bottles return to Rashid&apos;s stock; damaged are
          written off.
        </p>

        <label className="mt-4 block text-sm font-medium text-zinc-800">
          Note (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Returned from shop after 2 months"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-600">Loading…</p>
        ) : (
          <>
            {unused.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-600">Add product:</span>
                <select
                  className="min-w-[12rem] rounded border border-zinc-200 px-2 py-1 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) addProduct(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">Choose product…</option>
                  {unused.map((p) => (
                    <option key={p.productCode} value={p.productCode}>
                      {p.productName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left text-xs uppercase text-zinc-600">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">On this PO</th>
                    <th className="px-3 py-2">Returned (good)</th>
                    <th className="px-3 py-2">Damaged</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-zinc-500">
                        Add a product above to record a return.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, i) => {
                      const closure = closureByProduct[line.productCode];
                      const onPo = closure?.dispatchedBottles
                        ? `${closure.dispatchedBottles} dispatched · ${closure.deliveredBottles} delivered`
                        : "Not on PO";
                      return (
                        <tr key={line.productCode} className="border-t border-zinc-100">
                          <td className="px-3 py-2 font-medium">{line.productName}</td>
                          <td className="px-3 py-2 text-xs text-zinc-600">{onPo}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={line.returnedBottles}
                              onChange={(e) =>
                                updateLine(i, { returnedBottles: Number(e.target.value) || 0 })
                              }
                              className="w-24 rounded border border-zinc-200 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={line.damagedBottles}
                              onChange={(e) =>
                                updateLine(i, { damagedBottles: Number(e.target.value) || 0 })
                              }
                              className="w-24 rounded border border-zinc-200 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              className="text-xs text-red-600 hover:text-red-800"
                              title="Remove row"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || loading}
            className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Record late return"}
          </button>
        </div>
      </div>
    </div>
  );
}
