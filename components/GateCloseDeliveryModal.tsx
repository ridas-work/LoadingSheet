"use client";

import { useEffect, useState } from "react";

import type { DeliveryClosureLine, DeliveryOutcome } from "@/lib/gateDeliveryClosure";

type ProductOption = { productCode: string; productName: string };

type Props = {
  orderId: string;
  poNumber: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

function isPastReturnLine(line: DeliveryClosureLine): boolean {
  return line.dispatchedBottles === 0;
}

export function GateCloseDeliveryModal({ orderId, poNumber, open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<DeliveryOutcome>("full");
  const [lines, setLines] = useState<DeliveryClosureLine[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductOption[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLineErrors({});
    setOutcome("full");
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/gate-delivery`);
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          dispatchedLines?: DeliveryClosureLine[];
          catalogProducts?: ProductOption[];
        };
        if (!res.ok) {
          setError(data.error || "Could not load order lines.");
          setLines([]);
          setCatalogProducts([]);
          return;
        }
        setLines(data.dispatchedLines ?? []);
        setCatalogProducts(data.catalogProducts ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, orderId]);

  function displayLines(): DeliveryClosureLine[] {
    if (outcome === "full") {
      return lines
        .filter((l) => l.dispatchedBottles > 0)
        .map((l) => ({
          ...l,
          deliveredBottles: l.dispatchedBottles,
          damagedBottles: 0,
          returnedBottles: 0,
        }));
    }
    return lines;
  }

  function updateLine(index: number, patch: Partial<DeliveryClosureLine>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addPastReturnProduct(code: string) {
    const product = catalogProducts.find((p) => p.productCode === code);
    if (!product || lines.some((l) => l.productCode === product.productCode)) return;
    setLines((prev) => [
      ...prev,
      {
        productCode: product.productCode,
        productName: product.productName,
        dispatchedBottles: 0,
        deliveredBottles: 0,
        damagedBottles: 0,
        returnedBottles: 0,
      },
    ]);
  }

  function removePastReturnLine(index: number) {
    if (!isPastReturnLine(lines[index])) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const unusedCatalog = catalogProducts.filter(
    (p) => !lines.some((l) => l.productCode === p.productCode),
  );

  async function submit() {
    setSubmitting(true);
    setError(null);
    setLineErrors({});
    try {
      const payloadLines = displayLines();
      const res = await fetch(`/api/orders/${orderId}/gate-delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "delivered",
          closure: { outcome, lines: payloadLines },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string>;
        deliveryClosure?: {
          totals?: {
            deliveredBottles: number;
            displayDeliveredBottles?: number;
            damagedBottles: number;
            returnedBottles: number;
          };
        };
      };
      if (!res.ok) {
        if (data.errors) {
          setLineErrors(data.errors);
          setError("Check the bottle counts below.");
        } else {
          setError(data.error || "Could not close delivery.");
        }
        return;
      }
      const t = data.deliveryClosure?.totals;
      const msg = t
        ? `Closed ${poNumber} — ${t.displayDeliveredBottles ?? t.deliveredBottles} delivered, ${t.returnedBottles} returned to stock, ${t.damagedBottles} damaged.`
        : `Closed ${poNumber}.`;
      onSuccess(msg);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const rows = outcome === "full" ? lines.filter((l) => l.dispatchedBottles > 0) : lines;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Close delivery — {poNumber}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Mark this PO delivered and closed. Good returned bottles go back to Rashid&apos;s ready stock;
          damaged bottles are written off. Returns can be <strong>more than dispatched</strong> (e.g.
          bottles from older deliveries). Add products not on this PO under past returns.
        </p>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="outcome"
              checked={outcome === "full"}
              onChange={() => setOutcome("full")}
            />
            Fully delivered
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="outcome"
              checked={outcome === "partial"}
              onChange={() => setOutcome("partial")}
            />
            Partially delivered (returns on truck)
          </label>
        </div>

        {outcome === "partial" && unusedCatalog.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-600">Add past return (not on this PO):</span>
            <select
              className="rounded border border-zinc-200 px-2 py-1 text-sm"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addPastReturnProduct(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Choose product…</option>
              {unusedCatalog.map((p) => (
                <option key={p.productCode} value={p.productCode}>
                  {p.productName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-zinc-600">Loading products…</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="bg-zinc-50 text-left text-xs uppercase text-zinc-600">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Dispatched</th>
                  <th className="px-3 py-2">Delivered</th>
                  <th className="px-3 py-2">Damaged</th>
                  <th className="px-3 py-2">Returned (good)</th>
                  {outcome === "partial" ? <th className="px-3 py-2 w-8" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((line, i) => {
                  const pastReturn = isPastReturnLine(line);
                  return (
                    <tr
                      key={`${line.productCode}-${i}`}
                      className={`border-t border-zinc-100 ${pastReturn ? "bg-amber-50/60" : ""}`}
                    >
                      <td className="px-3 py-2 font-medium">
                        {line.productName}
                        {pastReturn ? (
                          <span className="ml-1 block text-xs font-normal text-amber-800">
                            Past return (not on PO)
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{pastReturn ? "—" : line.dispatchedBottles}</td>
                      <td className="px-3 py-2">
                        {outcome === "full" || pastReturn ? (
                          pastReturn ? "—" : line.dispatchedBottles
                        ) : (
                          <input
                            type="number"
                            min={0}
                            max={line.dispatchedBottles}
                            value={line.deliveredBottles}
                            onChange={(e) =>
                              updateLine(i, { deliveredBottles: Number(e.target.value) || 0 })
                            }
                            className="w-20 rounded border border-zinc-200 px-2 py-1"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {outcome === "full" ? (
                          0
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={line.damagedBottles}
                            onChange={(e) =>
                              updateLine(i, { damagedBottles: Number(e.target.value) || 0 })
                            }
                            className="w-20 rounded border border-zinc-200 px-2 py-1"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {outcome === "full" ? (
                          0
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={line.returnedBottles}
                            onChange={(e) =>
                              updateLine(i, { returnedBottles: Number(e.target.value) || 0 })
                            }
                            className="w-20 rounded border border-zinc-200 px-2 py-1"
                          />
                        )}
                      </td>
                      {outcome === "partial" ? (
                        <td className="px-3 py-2">
                          {pastReturn ? (
                            <button
                              type="button"
                              onClick={() => removePastReturnLine(i)}
                              className="text-xs text-red-600 hover:text-red-800"
                              title="Remove"
                            >
                              ✕
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {outcome === "partial" ? (
          <p className="mt-2 text-xs text-zinc-500">
            Example: 10 Rhino dispatched, customer kept 0 — enter 30 damaged + 20 returned (50 total back,
            including stock from past orders).
          </p>
        ) : null}

        {lineErrors.outcome ? <p className="mt-2 text-sm text-red-600">{lineErrors.outcome}</p> : null}
        {lineErrors.lines ? <p className="mt-2 text-sm text-red-600">{lineErrors.lines}</p> : null}
        {Object.entries(lineErrors)
          .filter(([k]) => k.startsWith("lines."))
          .map(([k, v]) => (
            <p key={k} className="mt-1 text-sm text-red-600">
              {v}
            </p>
          ))}

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
            disabled={submitting || loading || rows.length === 0}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Closing…" : "Close delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
