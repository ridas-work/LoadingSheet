"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SheetLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  batchNo?: string;
  weight?: string;
};

type OrderDetail = {
  _id: string;
  poNumber: string;
  customerName: string;
  sheetLines: SheetLine[];
};

export default function ProductionOrderBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [batches, setBatches] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/orders/${orderId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load order");
        }
        return res.json();
      })
      .then((data: OrderDetail) => {
        if (cancelled) return;
        setOrder(data);
        const initial: Record<number, string> = {};
        for (const line of data.sheetLines ?? []) {
          initial[line.boxNo] = line.batchNo ?? "";
        }
        setBatches(initial);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const filledCount = useMemo(() => {
    return Object.values(batches).filter((v) => v.trim().length > 0).length;
  }, [batches]);

  const totalCount = order?.sheetLines?.length ?? 0;

  const onSave = useCallback(async () => {
    if (!orderId || !order) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      batches: order.sheetLines.map((line) => ({
        boxNo: line.boxNo,
        batchNo: batches[line.boxNo] ?? "",
      })),
    };

    const res = await fetch(`/api/orders/${orderId}/batches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
      return;
    }

    setSaved(true);
  }, [batches, order, orderId]);

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading order…</p>;
  }

  if (error && !order) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{error}</p>
        <Link href="/production/batches" className="text-sm font-medium text-zinc-900 underline">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/production/batches" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← All orders
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{order.poNumber}</h1>
        <p className="text-sm text-zinc-600">{order.customerName}</p>
        <p className="mt-1 text-sm text-zinc-500">
          {filledCount}/{totalCount} batch numbers entered
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
            <tr>
              <th className="px-3 py-2 font-medium">Box</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Bottles</th>
              <th className="px-3 py-2 font-medium">Batch No</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {order.sheetLines.map((line) => (
              <tr key={line.boxNo}>
                <td className="px-3 py-2 text-zinc-900">{line.boxNo}</td>
                <td className="px-3 py-2 text-zinc-800">{line.productName}</td>
                <td className="px-3 py-2 text-zinc-600">{line.bottlesPerBox}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={batches[line.boxNo] ?? ""}
                    onChange={(e) => {
                      setSaved(false);
                      setBatches((prev) => ({ ...prev, [line.boxNo]: e.target.value }));
                    }}
                    className="w-full min-w-[8rem] rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400"
                    placeholder="e.g. 260415"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">Batch numbers saved.</p> : null}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save batches"}
      </button>
    </div>
  );
}
