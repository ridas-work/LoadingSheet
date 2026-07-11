"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { AdminDeliverySummary, DeliveryClosureRow, SummaryLineRow } from "@/lib/adminDeliverySummary";

function SummaryTable({
  title,
  description,
  rows,
  tone,
}: {
  title: string;
  description: string;
  rows: SummaryLineRow[];
  tone: "green" | "amber" | "red";
}) {
  const headClass =
    tone === "green"
      ? "bg-green-100 text-green-950"
      : tone === "amber"
        ? "bg-amber-100 text-amber-950"
        : "bg-red-100 text-red-950";

  const borderClass =
    tone === "green"
      ? "border-green-200"
      : tone === "amber"
        ? "border-amber-200"
        : "border-red-200";

  return (
    <section className={`rounded-xl border ${borderClass} bg-white shadow-sm overflow-hidden`}>
      <div className={`px-4 py-3 ${headClass}`}>
        <h2 className="text-sm font-semibold">
          {title} <span className="font-normal opacity-80">({rows.length})</span>
        </h2>
        <p className="mt-0.5 text-xs opacity-90">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-2 font-semibold">PO no</th>
              <th className="px-3 py-2 font-semibold">Customer</th>
              <th className="px-3 py-2 font-semibold">Product / scope</th>
              <th className="px-3 py-2 font-semibold">Quantity</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-zinc-500">
                  Nothing in this section.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/orders/${row.orderId}/loading-sheet`}
                      className="font-medium text-zinc-900 underline"
                    >
                      {row.poNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.customerName}</td>
                  <td className="px-3 py-2">{row.productName}</td>
                  <td className="px-3 py-2 text-zinc-700">{row.qtyLabel}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">{row.detail}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{row.dateLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClosureTable({ rows }: { rows: DeliveryClosureRow[] }) {
  return (
    <section className="rounded-xl border border-violet-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-violet-100 text-violet-950">
        <h2 className="text-sm font-semibold">
          Delivery closure <span className="font-normal opacity-80">({rows.length})</span>
        </h2>
        <p className="mt-0.5 text-xs opacity-90">
          Per PO and product — bottles delivered to customer, damaged (write-off), and returned good to Rashid
          stock (includes late returns).
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-2 font-semibold">PO no</th>
              <th className="px-3 py-2 font-semibold">Customer</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Delivered</th>
              <th className="px-3 py-2 font-semibold">Damaged</th>
              <th className="px-3 py-2 font-semibold">Returned</th>
              <th className="px-3 py-2 font-semibold">Outcome</th>
              <th className="px-3 py-2 font-semibold">Closed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-zinc-500">
                  No closed deliveries yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/orders/${row.orderId}/loading-sheet`}
                      className="font-medium text-zinc-900 underline"
                    >
                      {row.poNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.customerName}</td>
                  <td className="px-3 py-2">{row.productName}</td>
                  <td className="px-3 py-2 text-zinc-700">{row.deliveredBottles}</td>
                  <td className="px-3 py-2 text-zinc-700">{row.damagedBottles}</td>
                  <td className="px-3 py-2 text-zinc-700">{row.returnedBottles}</td>
                  <td className="px-3 py-2 text-xs capitalize">{row.deliveryOutcome.replace("_", " ")}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{row.closedAtLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminDeliverySummary() {
  const [data, setData] = useState<AdminDeliverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/delivery-summary", { credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setError("Could not load delivery summary.");
        return;
      }
      setData((await res.json()) as AdminDeliverySummary);
    } catch {
      setError("Could not load delivery summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Delivered, pending &amp; closed</h1>
          <p className="mt-1 text-sm text-zinc-600">
            POs and subtracted lines — delivered at gate, still open, or permanently discarded.
          </p>
        </div>
        {data ? (
          <p className="text-xs text-zinc-500">As of {data.reportDate}</p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : data ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
          <ClosureTable rows={data.closureRows} />
          <SummaryTable
            title="Delivered"
            description="POs marked delivered at the gate, plus subtracted lines marked sent."
            rows={data.delivered}
            tone="green"
          />
          <SummaryTable
            title="Pending"
            description="Open POs not yet delivered, plus subtracted lines waiting to be sent."
            rows={data.pending}
            tone="amber"
          />
          <SummaryTable
            title="Closed — discarded"
            description="Whole POs discarded by boss, plus subtracted lines permanently discarded — will not be dispatched."
            rows={data.closed}
            tone="red"
          />
        </div>
      ) : null}
    </div>
  );
}
