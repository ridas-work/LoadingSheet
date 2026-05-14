import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { DispatchTripForm } from "@/components/DispatchTripForm";
import type { PickerOrder } from "@/components/DispatchTripOrderPicker";
import { connectToDatabase } from "@/lib/db";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { batchProgress } from "@/lib/orderBatchStatus";
import { EMPTY_DISPATCH, type DispatchFields } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DispatchTripDetailPage(props: PageProps) {
  const { id } = await props.params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id).lean();
  if (!trip) notFound();

  const [orderDocs, linkedOrders] = await Promise.all([
    Order.find({})
      .sort({ createdAt: -1 })
      .select({ poNumber: 1, customerName: 1, dispatchTripId: 1 })
      .lean(),
    Order.find({ _id: { $in: trip.orderIds ?? [] } })
      .select({ poNumber: 1, customerName: 1, sheetLines: 1 })
      .lean(),
  ]);

  const orders: PickerOrder[] = orderDocs.map((o) => ({
    id: o._id.toString(),
    poNumber: o.poNumber,
    customerName: o.customerName,
    dispatchTripId: o.dispatchTripId ? o.dispatchTripId.toString() : null,
  }));

  const initialDispatch: DispatchFields = {
    ...EMPTY_DISPATCH,
    vehicleNo: trip.vehicleNo ?? "",
    driverName: trip.driverName ?? "",
    dcNo: trip.dcNo ?? "",
    helperName: trip.helperName ?? "",
    productionIncharge: trip.productionIncharge ?? "",
    securityName: trip.securityName ?? "",
    driverSignature: trip.driverSignature ?? "",
  };

  const initialOrderIds = (trip.orderIds ?? []).map((oid) => oid.toString());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dispatch trip</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Vehicle {trip.vehicleNo?.trim() || "—"} · {initialOrderIds.length} PO
          {initialOrderIds.length !== 1 ? "s" : ""}
        </p>
      </div>

      {linkedOrders.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Loading sheets</h2>
          <ul className="mt-2 space-y-2">
            {linkedOrders.map((o) => {
              const oid = o._id.toString();
              const { filled, total, complete } = batchProgress(o.sheetLines);
              return (
                <li
                  key={oid}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-zinc-900">
                      {o.poNumber} — {o.customerName}
                    </span>
                    <p className="text-xs text-zinc-500">
                      {complete
                        ? "Batches assigned — locked"
                        : total > 0
                          ? `${filled}/${total} batches assigned`
                          : "No carton rows"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {complete ? (
                      <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                        Batches assigned
                      </span>
                    ) : (
                      <Link
                        href={`/orders/${oid}/loading-sheet?dispatch=1`}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                      >
                        Assign batches
                      </Link>
                    )}
                    <Link
                      href={`/orders/${oid}/loading-sheet`}
                      className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                    >
                      View / print
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <DispatchTripForm
        tripId={id}
        initialOrderIds={initialOrderIds}
        orders={orders}
        initialDispatch={initialDispatch}
      />
    </div>
  );
}
