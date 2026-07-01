import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import { DispatchTripForm } from "@/components/DispatchTripForm";
import type { PickerOrder } from "@/components/DispatchTripOrderPicker";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { loadDispatchFleetOptions } from "@/lib/dispatchFleetOptions";
import {
  GATE_STATUS_LABELS,
  isRashidActiveGateStatus,
  isTripActiveForPlanner,
  normalizeGateStatus,
  rashidActiveOrdersMongoFilter,
} from "@/lib/gateDelivery";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { batchProgress } from "@/lib/orderBatchStatus";
import { canAssignDispatchBatches, canEditDispatchTrip, EMPTY_DISPATCH, homePathForRole, isDispatchTripPlanner, roleFromSession, type DispatchFields } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
};

function ReadOnlyDispatchSummary({ dispatch }: { dispatch: DispatchFields }) {
  const rows: Array<[string, string]> = [
    ["Vehicle", dispatch.vehicleNo],
    ["Driver", dispatch.driverName],
    ["DC no", dispatch.dcNo],
    ["Helper", dispatch.helperName],
    ["Production incharge", dispatch.productionIncharge],
    ["Security", dispatch.securityName],
    ["Driver signature", dispatch.driverSignature],
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-zinc-900">Trip details</h2>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="font-medium text-zinc-600">{label}</dt>
            <dd className="text-zinc-900">{value?.trim() || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function DispatchTripDetailPage(props: PageProps) {
  const { id } = await props.params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (role && role !== "dispatch_editor" && role !== "admin") {
    redirect(homePathForRole(role));
  }
  const canEditTrip = canEditDispatchTrip(role, username);
  const canAssignBatches = canAssignDispatchBatches(role, username);
  const hideCompletedTrips = isDispatchTripPlanner(role, username) && role !== "admin";

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id).lean();
  if (!trip) notFound();

  const tripOrderIds = trip.orderIds ?? [];

  if (hideCompletedTrips && tripOrderIds.length > 0) {
    const gateRows = await Order.find({ _id: { $in: tripOrderIds } })
      .select({ gateDeliveryStatus: 1 })
      .lean();
    const statuses = gateRows.map((o) => normalizeGateStatus(o.gateDeliveryStatus));
    if (!isTripActiveForPlanner(statuses)) {
      redirect("/dispatch/trips");
    }
  }
  const pickerQuery =
    tripOrderIds.length > 0
      ? { $or: [rashidActiveOrdersMongoFilter(), { _id: { $in: tripOrderIds } }] }
      : rashidActiveOrdersMongoFilter();

  const [orderDocs, linkedOrders, fleetOptions] = await Promise.all([
    Order.find(pickerQuery)
      .sort({ createdAt: -1 })
      .select({ poNumber: 1, customerName: 1, dispatchTripId: 1 })
      .lean(),
    Order.find({ _id: { $in: tripOrderIds } })
      .select({ poNumber: 1, customerName: 1, sheetLines: 1, gateDeliveryStatus: 1 })
      .lean(),
    loadDispatchFleetOptions(),
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
          {!canEditTrip ? " · Read-only" : ""}
        </p>
      </div>

      {linkedOrders.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Loading sheets</h2>
          <ul className="mt-2 space-y-2">
            {linkedOrders.map((o) => {
              const oid = o._id.toString();
              const { filled, total, complete } = batchProgress(o.sheetLines);
              const gateStatus = normalizeGateStatus(o.gateDeliveryStatus);
              const rashidActive = isRashidActiveGateStatus(gateStatus);
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
                      {!rashidActive ? ` · ${GATE_STATUS_LABELS[gateStatus]}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canAssignBatches && rashidActive && !complete ? (
                      <Link
                        href={`/orders/${oid}/loading-sheet?dispatch=1`}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                      >
                        Assign batches
                      </Link>
                    ) : canAssignBatches && rashidActive && complete ? (
                      <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                        Batches assigned
                      </span>
                    ) : !rashidActive ? (
                      <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200">
                        {GATE_STATUS_LABELS[gateStatus]}
                      </span>
                    ) : null}
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

      {canEditTrip ? (
        <DispatchTripForm
          tripId={id}
          initialOrderIds={initialOrderIds}
          orders={orders}
          initialDispatch={initialDispatch}
          vehicleOptions={fleetOptions.vehicles}
          driverOptions={fleetOptions.drivers}
        />
      ) : (
        <ReadOnlyDispatchSummary dispatch={initialDispatch} />
      )}
    </div>
  );
}
