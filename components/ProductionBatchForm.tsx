"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type BatchFamily = { name: string; batchFamily: string };

type Props = {
  batchId?: string;
  initialBatchNo?: string;
  initialProductName?: string;
  initialTotalLiters?: number;
  initialPreparedAt?: string;
  initialPh?: string;
  initialSolids?: string;
  initialAppearance?: string;
  initialProvider?: string;
  initialDrum?: string;
  initialQuantity?: string;
};

function Field({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-100"
      />
    </div>
  );
}

export function ProductionBatchForm({
  batchId,
  initialBatchNo = "",
  initialProductName = "",
  initialTotalLiters,
  initialPreparedAt,
  initialPh = "",
  initialSolids = "",
  initialAppearance = "",
  initialProvider = "",
  initialDrum = "",
  initialQuantity = "",
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(batchId);
  const [families, setFamilies] = useState<BatchFamily[]>([]);
  const [batchNo, setBatchNo] = useState(initialBatchNo);
  const [productName, setProductName] = useState(initialProductName);
  const [totalLiters, setTotalLiters] = useState(
    initialTotalLiters != null ? String(initialTotalLiters) : "",
  );
  const [preparedAt, setPreparedAt] = useState(
    initialPreparedAt ?? new Date().toISOString().slice(0, 10),
  );
  const [ph, setPh] = useState(initialPh);
  const [solids, setSolids] = useState(initialSolids);
  const [appearance, setAppearance] = useState(initialAppearance);
  const [provider, setProvider] = useState(initialProvider);
  const [drum, setDrum] = useState(initialDrum);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { batchFamilies?: BatchFamily[]; products?: BatchFamily[] }) => {
        const list = Array.isArray(data.batchFamilies)
          ? data.batchFamilies
          : Array.isArray(data.products)
            ? data.products.map((p) => ({
                name: (p as { batchFamily?: string; name: string }).batchFamily ?? p.name,
                batchFamily: (p as { batchFamily?: string; name: string }).batchFamily ?? p.name,
              }))
            : [];
        setFamilies(list);
      })
      .catch(() => setFamilies([]));
  }, []);

  const canSubmit = useMemo(
    () =>
      batchNo.trim().length > 0 &&
      productName.length > 0 &&
      Number(totalLiters) > 0 &&
      ph.trim().length > 0 &&
      solids.trim().length > 0 &&
      appearance.trim().length > 0 &&
      provider.trim().length > 0 &&
      drum.trim().length > 0 &&
      quantity.trim().length > 0,
    [appearance, batchNo, drum, ph, productName, provider, quantity, solids, totalLiters],
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
      ph: ph.trim(),
      solids: solids.trim(),
      appearance: appearance.trim(),
      provider: provider.trim(),
      drum: drum.trim(),
      quantity: quantity.trim(),
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
      <Field
        id="batchNo"
        label="Batch number"
        value={batchNo}
        onChange={setBatchNo}
        disabled={isEdit}
        placeholder="e.g. 250728-1"
      />

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
          {families.map((f) => (
            <option key={f.batchFamily} value={f.batchFamily}>
              {f.batchFamily}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          One batch covers all packings in the family (e.g. Power Wash and Power Wash pouch).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="preparedAt">
          Date
        </label>
        <input
          id="preparedAt"
          type="date"
          value={preparedAt}
          onChange={(e) => setPreparedAt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      <Field id="ph" label="pH" value={ph} onChange={setPh} placeholder="e.g. 7 or 6.5-7" />
      <Field id="solids" label="Solids" value={solids} onChange={setSolids} placeholder="e.g. 29-30% (sinking 17)" />
      <Field id="appearance" label="Appearance" value={appearance} onChange={setAppearance} placeholder="e.g. Clear liquid" />
      <Field id="provider" label="Provider" value={provider} onChange={setProvider} placeholder="e.g. Ramzan" />
      <Field id="drum" label="Drum" value={drum} onChange={setDrum} placeholder="e.g. 6 * 150" />
      <Field id="quantity" label="Quantity" value={quantity} onChange={setQuantity} placeholder="e.g. 450L or 750kg" />
      <p className="text-xs text-zinc-500">
        Quantity is stored exactly as entered for future reference. Total liters below is used for dispatch remaining-volume checks.
      </p>

      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="totalLiters">
          Total liters (dispatch pool)
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
