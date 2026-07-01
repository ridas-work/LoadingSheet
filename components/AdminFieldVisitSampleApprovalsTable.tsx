"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SAMPLE_MODE_LABELS, type SampleMode } from "@/lib/fieldVisitTypes";

export type PendingFieldSampleRow = {
  id: string;
  placeName: string;
  customerName: string;
  city: string;
  contactPhone: string;
  contactPerson: string;
  notes: string;
  sampleMode: SampleMode;
  sampleProducts: { productName: string; notes: string; bottles?: number }[];
  createdByName: string;
  createdAt: string;
  requestedAt: string;
};

type SampleStockLine = {
  productName: string;
  availableLiters: number;
  availableBottlesEstimate: number;
};

type Props = {
  visits: PendingFieldSampleRow[];
  sampleStock?: SampleStockLine[];
};

export function AdminFieldVisitSampleApprovalsTable({
  visits: initialVisits,
  sampleStock = [],
}: Props) {
  const router = useRouter();
  const [visits, setVisits] = useState(initialVisits);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function stockForProduct(productName: string): SampleStockLine | undefined {
    const trimmed = productName.trim().toLowerCase();
    return sampleStock.find(
      (line) =>
        line.productName.trim().toLowerCase() === trimmed ||
        line.productName.trim().toLowerCase().includes(trimmed) ||
        trimmed.includes(line.productName.trim().toLowerCase()),
    );
  }

  async function act(id: string, action: "approve" | "reject") {
    let note = "";
    if (action === "reject") {
      const input = window.prompt("Rejection note (optional):");
      if (input === null) return;
      note = input.trim();
    }

    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/field-visit-samples/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not update approval.");
        return;
      }
      setVisits((prev) => prev.filter((v) => v.id !== id));
      router.refresh();
    } catch {
      setError("Could not update approval.");
    } finally {
      setBusyId(null);
    }
  }

  if (visits.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600">
        No field visit sample requests waiting for approval.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {visits.map((v) => (
        <article
          key={v.id}
          className="rounded-xl border border-sky-200 bg-white shadow-sm ring-1 ring-sky-100"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-900">
                  Field visit sample
                </span>
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                  {SAMPLE_MODE_LABELS[v.sampleMode]}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">{v.placeName}</h2>
              <p className="text-sm font-medium text-zinc-700">{v.customerName}</p>
              <p className="text-xs text-zinc-500">
                {v.city ? `${v.city} · ` : ""}
                {v.contactPerson ? `${v.contactPerson} · ` : ""}
                {v.contactPhone ? `${v.contactPhone} · ` : ""}
                Requested by {v.createdByName || "—"}
                {v.requestedAt ? ` · ${new Date(v.requestedAt).toLocaleString()}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/field-visits/${v.id}`}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 ring-1 ring-zinc-200"
              >
                View visit
              </Link>
              <button
                type="button"
                disabled={busyId === v.id}
                onClick={() => void act(v.id, "approve")}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Approve sample
              </button>
              <button
                type="button"
                disabled={busyId === v.id}
                onClick={() => void act(v.id, "reject")}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-800 ring-1 ring-red-200 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
          <div className="bg-zinc-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Sample products requested
            </p>
            <ul className="space-y-1 text-sm text-zinc-800">
              {v.sampleProducts.map((p) => {
                const bottles = p.bottles && p.bottles > 1 ? p.bottles : 1;
                const stock = v.sampleMode === "outgoing" ? stockForProduct(p.productName) : undefined;
                return (
                  <li key={p.productName} className="flex flex-wrap items-baseline gap-x-2">
                    <span>
                      {p.productName}
                      {bottles > 1 ? ` × ${bottles} bottles` : ""}
                    </span>
                    {stock ? (
                      <span className="text-xs text-violet-800">
                        Sample pool: {stock.availableLiters} L (~{stock.availableBottlesEstimate} bottles)
                      </span>
                    ) : v.sampleMode === "outgoing" ? (
                      <span className="text-xs text-amber-800">No sample pool stock</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {v.notes ? (
              <p className="mt-2 text-xs text-zinc-600">
                <span className="font-medium">Notes:</span> {v.notes}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
