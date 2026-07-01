import { GATE_STATUS_LABELS, type GateDeliveryStatus } from "@/lib/gateDelivery";
import type { OrderPoDetail } from "@/lib/orderPoDetail";
import { ui } from "@/lib/ui";
import { OrderPoDetailPanel } from "@/components/OrderPoDetailPanel";

export type RashidPoOrderRow = {
  id: string;
  poNumber: string;
  customerName: string;
  createdAt: string;
  createdByName: string;
  gateDeliveryStatus: GateDeliveryStatus;
  pendingLineCount: number;
  detail: OrderPoDetail;
};

type Props = {
  orders: RashidPoOrderRow[];
};

export function RashidPoOrdersList({ orders }: Props) {
  return (
    <ul className={`${ui.card} divide-y divide-border-subtle`}>
      {orders.map((o) => (
        <li key={o.id} className={ui.orderRow}>
          <div className="space-y-3">
            <div>
              <p className="text-base font-semibold text-slate-900">{o.poNumber}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-600">{o.customerName}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {new Date(o.createdAt).toLocaleDateString()}
                {o.createdByName ? ` · Entered by ${o.createdByName}` : ""}
                {` · ${GATE_STATUS_LABELS[o.gateDeliveryStatus]}`}
                {o.pendingLineCount > 0
                  ? ` · ${o.pendingLineCount} pending line${o.pendingLineCount !== 1 ? "s" : ""}`
                  : ""}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                PO detail
              </p>
              <OrderPoDetailPanel detail={o.detail} compact />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
