"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatLiters } from "@/lib/batchVolume";

type Props = {
  batchId: string;
  batchNo: string;
  remainingLiters: number;
  usedLiters: number;
};

export function ProductionBatchCloseForm({
  batchId,
  batchNo,
  remainingLiters,
  usedLiters,
}: Props) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [wasteLiters, setWasteLiters] = useState(String(remainingLiters));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const waste = Number(wasteLiters);
    const res = await fetch(`/api/production-batches/${batchId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wasteLiters: waste, note, confirmed }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not close batch");
      return;
    }

    router.push("/production/batches/closed");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-zinc-900">Close batch</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Review batch <strong>{batchNo}</strong>, enter leftover waste, then close. Closed batches move to the
        archive and cannot be edited.
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-zinc-500">Used on POs / filling</dt>
          <dd className="font-medium text-zinc-900">{formatLiters(usedLiters)} L</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Remaining pool</dt>
          <dd className="font-medium text-zinc-900">{formatLiters(remainingLiters)} L</dd>
        </div>
      </dl>

      <label className="mt-4 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-zinc-300"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>I have checked this batch and QC record.</span>
      </label>

      <label className="mt-3 block text-sm">
        <span className="font-medium text-zinc-700">Waste (liters)</span>
        <input
          type="number"
          min={0}
          step="0.001"
          value={wasteLiters}
          onChange={(e) => setWasteLiters(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <span className="mt-1 block text-xs text-zinc-500">
          Leftover liquid not used — must be ≤ {formatLiters(remainingLiters)} L remaining.
        </span>
      </label>

      <label className="mt-3 block text-sm">
        <span className="font-medium text-zinc-700">Note (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. drained to waste tank, sample retained…"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting || !confirmed}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Closing…" : "Close batch"}
      </button>
    </form>
  );
}
