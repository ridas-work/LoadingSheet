"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { OrderPoDetailPanel } from "@/components/OrderPoDetailPanel";
import type { OrderPoDetail } from "@/lib/orderPoDetail";
import { isSampleStyleOrder } from "@/lib/orderApproval";

export type PendingApprovalRow = {
  id: string;
  poNumber: string;
  customerName: string;
  city: string;
  deadlineDisplay: string;
  createdByName: string;
  createdAt: string;
  cartonCount: number;
  orderKind: string;
  requestTypeLabel: string;
  isSubtractionRequest?: boolean;
  detail: OrderPoDetail;
};

type Props = {
  orders: PendingApprovalRow[];
};

export function AdminPoApprovalsTable({ orders: initialOrders }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    const row = orders.find((o) => o.id === id);
    const poNumber = row?.poNumber.trim() ?? "";
    const isSubtraction = Boolean(row?.isSubtractionRequest);
    let note = "";
    if (action === "reject") {
      const input = window.prompt(
        isSubtraction ? "Discard note (optional):" : "Rejection note (optional):",
      );
      if (input === null) return;
      note = input.trim();
    }

    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}/approval`, {
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
      setOrders((prev) =>
        poNumber ? prev.filter((o) => o.poNumber.trim() !== poNumber) : prev.filter((o) => o.id !== id),
      );
      router.refresh();
    } catch {
      setError("Could not update approval.");
    } finally {
      setBusyId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
        No order requests waiting for approval.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {orders.map((o) => {
        const sampleStyle = isSampleStyleOrder(o.orderKind);
        return (
          <article
            key={o.id}
            className="rounded-xl border border-amber-200 bg-white shadow-sm ring-1 ring-amber-100"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {o.isSubtractionRequest ? (
                    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-900">
                      Subtracted items
                    </span>
                  ) : null}
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
                    Order request
                  </span>
                  {sampleStyle ? (
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                      {o.requestTypeLabel}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">{o.requestTypeLabel}</span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">{o.poNumber}</h2>
                <p className="text-sm font-medium text-zinc-700">{o.customerName}</p>
                <p className="text-xs text-zinc-500">
                  {o.city ? `${o.city} · ` : ""}
                  Deadline {o.deadlineDisplay || "—"}
                  {o.createdByName ? ` · Entered by ${o.createdByName}` : ""}
                  {o.createdAt ? ` · ${new Date(o.createdAt).toLocaleString()}` : ""}
                  {` · ${o.cartonCount} loading-sheet row${o.cartonCount !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/orders/${o.id}/loading-sheet`}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 ring-1 ring-zinc-200"
                >
                  Loading sheet
                </Link>
                <button
                  type="button"
                  disabled={busyId === o.id}
                  onClick={() => void act(o.id, "approve")}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === o.id}
                  onClick={() => void act(o.id, "reject")}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-800 ring-1 ring-red-200 disabled:opacity-50"
                >
                  {o.isSubtractionRequest ? "Discard" : "Reject"}
                </button>
              </div>
            </div>
            <div className="bg-zinc-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Order detail
              </p>
              <OrderPoDetailPanel detail={o.detail} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
