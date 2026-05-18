"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Movement = {
  id: string;
  quantityDelta: number;
  quantityAfter: number;
  reason: string;
  note: string;
  recordedByName: string;
  createdAt: string;
};

type Props = {
  code: string;
  name: string;
  unit: string;
  initialOnHand: number;
  initialMovements: Movement[];
  readOnly?: boolean;
};

export function PackagingCountForm({
  code,
  name,
  unit,
  initialOnHand,
  initialMovements,
  readOnly,
}: Props) {
  const router = useRouter();
  const [onHand, setOnHand] = useState(String(initialOnHand));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [movements, setMovements] = useState(initialMovements);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    const value = Number(onHand);
    if (!Number.isInteger(value) || value < 0) {
      setError("Count must be a whole number ≥ 0.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/packaging-items/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onHand: value, note }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Save failed");
      return;
    }

    const data = (await res.json()) as {
      item: { onHand: number };
    };

    setSaved(true);
    setOnHand(String(data.item.onHand));

    const detailRes = await fetch(`/api/packaging-items/${encodeURIComponent(code)}`);
    if (detailRes.ok) {
      const detail = (await detailRes.json()) as { movements?: Movement[] };
      if (detail.movements) setMovements(detail.movements);
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!readOnly ? (
        <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 bg-white p-6">
          <label className="block text-sm font-medium text-zinc-800" htmlFor="onHand">
            Physical count ({unit})
          </label>
          <input
            id="onHand"
            inputMode="numeric"
            value={onHand}
            onChange={(e) => setOnHand(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <label className="mt-4 block text-sm font-medium text-zinc-800" htmlFor="note">
            Note (optional)
          </label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Monthly stock take"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          {saved ? <p className="mt-2 text-sm text-emerald-700">Saved.</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save count"}
          </button>
        </form>
      ) : (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          On hand: <strong>{initialOnHand.toLocaleString()}</strong> {unit} (read-only)
        </p>
      )}

      {movements.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Recent changes</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {movements.map((m) => (
              <li key={m.id} className="border-b border-zinc-100 pb-2 last:border-0">
                <span className="font-medium tabular-nums">
                  {m.quantityDelta >= 0 ? "+" : ""}
                  {m.quantityDelta}
                </span>{" "}
                → {m.quantityAfter.toLocaleString()} {unit}
                <span className="text-zinc-500">
                  {" "}
                  · {m.recordedByName || "—"} ·{" "}
                  {new Date(m.createdAt).toLocaleString()}
                </span>
                {m.note ? <div className="text-xs text-zinc-500">{m.note}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
