"use client";

import Link from "next/link";
import { useState } from "react";

import {
  GATE_STATUS_LABELS,
  isOrderLockedAfterDelivery,
  isRashidActiveGateStatus,
  type GateDeliveryStatus,
} from "@/lib/gateDelivery";

type OrderRow = {
  id: string;
  poNumber: string;
  customerName: string;
  createdAt: string;
  createdByName?: string;
  filled: number;
  total: number;
  dispatchTripId: string | null;
  vehicleNo: string;
  gateDeliveryStatus?: GateDeliveryStatus;
};

type Props = {
  orders: OrderRow[];
  isDispatchEditor: boolean;
  showEnteredBy?: boolean;
  canEditOrders?: boolean;
  /** Admin oversight — show gate delivery status on every row. */
  showGateStatus?: boolean;
};

export function OrdersListWithTrips({
  orders,
  isDispatchEditor,
  showEnteredBy = false,
  canEditOrders = false,
  showGateStatus = false,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createTripHref =
    selected.length > 0 ? `/dispatch/trips/new?orderIds=${encodeURIComponent(selected.join(","))}` : null;

  return (
    <div className="space-y-4">
      {isDispatchEditor && orders.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {createTripHref ? (
            <Link
              href={createTripHref}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
            >
              Create trip with {selected.length} selected
            </Link>
          ) : (
            <span className="text-sm text-zinc-500">Select POs below to start a multi-PO trip.</span>
          )}
        </div>
      ) : null}

      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {orders.map((o) => {
          const onTrip = o.dispatchTripId != null && o.dispatchTripId.length > 0;
          const batchesLocked = o.total > 0 && o.filled === o.total;
          const checked = selected.includes(o.id);
          const rashidActive = isRashidActiveGateStatus(o.gateDeliveryStatus);
          const gateStatus = o.gateDeliveryStatus ?? "none";
          const showAssignBatches = isDispatchEditor && rashidActive && !batchesLocked;
          const showEditOrder =
            canEditOrders && !isOrderLockedAfterDelivery(gateStatus);

          return (
            <li key={o.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {isDispatchEditor ? (
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggle(o.id)}
                      aria-label={`Select ${o.poNumber}`}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">{o.poNumber}</p>
                    <p className="text-sm text-zinc-600">{o.customerName}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(o.createdAt).toLocaleDateString()} · {o.filled}/{o.total} batches
                      {showEnteredBy && o.createdByName ? ` · Entered by ${o.createdByName}` : ""}
                    </p>
                    {onTrip ? (
                      <p className="mt-1 text-xs font-medium text-emerald-800">
                        On trip
                        {o.vehicleNo ? ` · Vehicle ${o.vehicleNo}` : ""}
                        {" · "}
                        <Link href={`/dispatch/trips/${o.dispatchTripId}`} className="underline">
                          View trip
                        </Link>
                      </p>
                    ) : null}
                    {(showGateStatus || (!rashidActive && isDispatchEditor)) ? (
                      <p
                        className={`mt-1 text-xs font-medium ${
                          gateStatus === "delivered"
                            ? "text-green-800"
                            : gateStatus === "out_for_delivery"
                              ? "text-amber-900"
                              : "text-zinc-600"
                        }`}
                      >
                        {GATE_STATUS_LABELS[gateStatus]}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {showEditOrder ? (
                    <Link
                      href={`/orders/${o.id}/edit`}
                      className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white"
                    >
                      Edit order
                    </Link>
                  ) : null}
                  <Link
                    href={`/orders/${o.id}/loading-sheet`}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                  >
                    View loading sheet
                  </Link>
                  {showAssignBatches ? (
                    <Link
                      href={`/orders/${o.id}/loading-sheet?dispatch=1`}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                    >
                      Assign batches
                    </Link>
                  ) : isDispatchEditor && rashidActive && batchesLocked ? (
                    <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                      Batches assigned
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
