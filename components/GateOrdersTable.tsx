"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  GATE_STATUS_LABELS,
  nextGateActions,
  type GateDeliveryStatus,
} from "@/lib/gateDelivery";

export type GateOrderRow = {
  id: string;
  poNumber: string;
  customerName: string;
  city: string;
  gateDeliveryStatus: GateDeliveryStatus;
  gateStatusLabel: string;
  dispatchTripId: string | null;
  vehicleNo: string;
  driverName: string;
  dcNo: string;
};

type FilterKey = "active" | "all" | "out" | "pending" | "delivered";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "out", label: "Out for delivery" },
  { key: "pending", label: "Pending redelivery" },
  { key: "delivered", label: "Delivered" },
  { key: "all", label: "All" },
];

const ACTION_LABELS: Record<GateDeliveryStatus, string> = {
  out_for_delivery: "Mark out for delivery",
  delivered: "Mark delivered",
  pending_redelivery: "Mark pending redelivery",
  none: "",
};

function statusBadgeClass(status: GateDeliveryStatus): string {
  if (status === "out_for_delivery") return "bg-blue-50 text-blue-900 ring-blue-200";
  if (status === "delivered") return "bg-green-50 text-green-900 ring-green-200";
  if (status === "pending_redelivery") return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-zinc-100 text-zinc-800 ring-zinc-200";
}

export function GateOrdersTable({ readOnly }: { readOnly?: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("active");
  const [orders, setOrders] = useState<GateOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rowSuccess, setRowSuccess] = useState<Record<string, string>>({});

  const load = useCallback(async (f: FilterKey) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gate/orders?filter=${f}`);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        orders?: GateOrderRow[];
      };
      if (!res.ok) {
        setError(data.error || `Failed to load (${res.status})`);
        setOrders([]);
        return;
      }
      setOrders(data.orders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function setStatus(orderId: string, status: GateDeliveryStatus) {
    if (readOnly) return;
    setBusyId(orderId);
    setRowError((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setRowSuccess((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    try {
      const res = await fetch(`/api/orders/${orderId}/gate-delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        packagingStockUpdated?: boolean;
        packagingDeductionSummary?: Array<{ itemName?: string; quantity?: number }>;
        readyBottleStockUpdated?: boolean;
        readyBottleDeductionSummary?: Array<{ productName?: string; bottles?: number }>;
      };
      if (!res.ok) {
        setRowError((prev) => ({ ...prev, [orderId]: data.error || `Save failed (${res.status})` }));
        return;
      }
      if (status === "delivered" && (data.packagingStockUpdated || data.readyBottleStockUpdated)) {
        const pkg = data.packagingDeductionSummary?.length ?? 0;
        const ready = data.readyBottleDeductionSummary?.length ?? 0;
        setRowSuccess((prev) => ({
          ...prev,
          [orderId]:
            ready > 0 && pkg > 0
              ? `Delivered — ready bottles (${ready} product${ready === 1 ? "" : "s"}) and packaging (${pkg} line${pkg === 1 ? "" : "s"}) updated.`
              : ready > 0
                ? `Delivered — ready bottle stock updated (${ready} product${ready === 1 ? "" : "s"}).`
                : pkg > 0
                  ? `Packaging stock updated (${pkg} line${pkg === 1 ? "" : "s"}).`
                  : "Delivered.",
        }));
        setTimeout(() => {
          setRowSuccess((p) => {
            const next = { ...p };
            delete next[orderId];
            return next;
          });
        }, 5000);
      }
      await load(filter);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.key
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-zinc-600">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No orders match this filter. Orders appear here only when Rashid has put them on a **dispatch trip**
          and filled **vehicle number, driver, and DC number** so the shipment is ready to leave the gate.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                <th className="px-4 py-2 font-medium">PO</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">City</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {!readOnly ? <th className="px-4 py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const actions = nextGateActions(o.gateDeliveryStatus);
                return (
                  <tr key={o.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-zinc-900">{o.poNumber}</td>
                    <td className="px-4 py-2 text-zinc-700">{o.customerName}</td>
                    <td className="px-4 py-2 text-zinc-600">{o.city || "—"}</td>
                    <td className="px-4 py-2 text-zinc-600">
                      {[o.vehicleNo, o.driverName].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(o.gateDeliveryStatus)}`}
                      >
                        {GATE_STATUS_LABELS[o.gateDeliveryStatus]}
                      </span>
                    </td>
                    {!readOnly ? (
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {actions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              disabled={busyId === o.id}
                              onClick={() => setStatus(o.id, action)}
                              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {ACTION_LABELS[action]}
                            </button>
                          ))}
                          {actions.length === 0 ? (
                            <span className="text-xs text-zinc-500">No further actions</span>
                          ) : null}
                        </div>
                        {rowError[o.id] ? (
                          <p className="mt-1 text-xs text-red-600">{rowError[o.id]}</p>
                        ) : null}
                        {rowSuccess[o.id] ? (
                          <p className="mt-1 text-xs text-emerald-700">{rowSuccess[o.id]}</p>
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
    </div>
  );
}
