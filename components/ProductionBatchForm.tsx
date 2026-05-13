"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Product = { name: string; bottlesPerCarton: number };

type Props = {
  batchId?: string;
  initialBatchNo?: string;
  initialProductName?: string;
  initialTotalLiters?: number;
  initialPreparedAt?: string;
  initialNotes?: string;
};

export function ProductionBatchForm({
  batchId,
  initialBatchNo = "",
  initialProductName = "",
  initialTotalLiters,
  initialPreparedAt,
  initialNotes = "",
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(batchId);
  const [products, setProducts] = useState<Product[]>([]);
  const [batchNo, setBatchNo] = useState(initialBatchNo);
  const [productName, setProductName] = useState(initialProductName);
  const [totalLiters, setTotalLiters] = useState(
    initialTotalLiters != null ? String(initialTotalLiters) : "",
  );
  const [preparedAt, setPreparedAt] = useState(
    initialPreparedAt ?? new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

  const canSubmit = useMemo(
    () => batchNo.trim().length > 0 && productName.length > 0 && Number(totalLiters) > 0,
    [batchNo, productName, totalLiters],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      batchNo: batchNo.trim(),
      productName,
      totalLiters: Number(totalLiters),
      preparedAt,
      notes: notes.trim(),
    };

    const res = await fetch(
      isEdit ? `/api/production-batches/${batchId}` : "/api/production-batches",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Save failed");
      return;
    }

    router.push("/production/batches");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="batchNo">
          Batch number
        </label>
        <input
          id="batchNo"
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value)}
          disabled={isEdit}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-100"
          placeholder="e.g. B-2405-12"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="productName">
          Product
        </label>
        <select
          id="productName"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="">Select product…</option>
          {products.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="totalLiters">
          Total liters
        </label>
        <input
          id="totalLiters"
          type="number"
          min="0.001"
          step="any"
          value={totalLiters}
          onChange={(e) => setTotalLiters(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder="e.g. 1000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="preparedAt">
          Prepared date
        </label>
        <input
          id="preparedAt"
          type="date"
          value={preparedAt}
          onChange={(e) => setPreparedAt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="notes">
          Notes (optional)
        </label>
        <input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Saving…" : isEdit ? "Update batch" : "Save batch"}
      </button>
    </form>
  );
}

