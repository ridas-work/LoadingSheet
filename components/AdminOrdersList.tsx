"use client";

import Link from "next/link";
import { useState } from "react";

import { OrderPoDetailPanel } from "@/components/OrderPoDetailPanel";
import {
  GATE_STATUS_LABELS,
  isOrderLockedAfterDelivery,
  type GateDeliveryStatus,
} from "@/lib/gateDelivery";
import type { OrderPoDetail } from "@/lib/orderPoDetail";
import { formatDisplayDate } from "@/lib/dateOnly";
import { ui } from "@/lib/ui";

export type AdminOrderListRow = {
  id: string;
  poNumber: string;
  customerName: string;
  city: string;
  deadlineDisplay: string;
  createdAt: string;
  createdByName: string;
  filled: number;
  total: number;
  gateDeliveryStatus: GateDeliveryStatus;
  detail: OrderPoDetail;
};

type Props = {
  orders: AdminOrderListRow[];
  allowEdit?: boolean;
};

export function AdminOrdersList({ orders, allowEdit = true }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function togglePo(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {orders.map((o) => {
        const expanded = expandedId === o.id;
        const gateStatus = o.gateDeliveryStatus;
        const showEdit = allowEdit && !isOrderLockedAfterDelivery(gateStatus);

        return (
          <li key={o.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{o.poNumber}</p>
                <p className="text-sm text-zinc-600">{o.customerName}</p>
                <p className="text-xs text-zinc-500">
                  {o.city ? `${o.city} · ` : ""}
                  {formatDisplayDate(o.createdAt)}
                  {o.deadlineDisplay ? ` · Deadline ${o.deadlineDisplay}` : ""}
                  {o.createdByName ? ` · Entered by ${o.createdByName}` : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {o.filled}/{o.total} batches · {GATE_STATUS_LABELS[gateStatus]}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {showEdit ? (
                  <Link
                    href={`/orders/${o.id}/edit`}
                    className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white"
                  >
                    Edit order
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => togglePo(o.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                    expanded ? "bg-brand-600" : "bg-zinc-900"
                  }`}
                >
                  {expanded ? "Hide PO" : "View PO"}
                </button>
              </div>
            </div>

            {expanded ? (
              <div className={`${ui.cardMuted} mt-4 rounded-xl border border-zinc-200 p-4`}>
                <p className="mb-3 text-sm font-semibold text-zinc-800">PO description — {o.poNumber}</p>
                <OrderPoDetailPanel detail={o.detail} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
