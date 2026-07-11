import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import { DispatchTripForm } from "@/components/DispatchTripForm";
import type { PickerOrder } from "@/components/DispatchTripOrderPicker";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { loadDispatchFleetOptions } from "@/lib/dispatchFleetOptions";
import { GATE_STATUS_LABELS, normalizeGateStatus } from "@/lib/gateDelivery";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { readySampleOrdersMongoFilter } from "@/lib/sampleDispatch";
import { canEditDispatchTrip, EMPTY_DISPATCH, homePathForRole, roleFromSession, type DispatchFields } from "@/lib/roles";

type PageProps = { params: Promise<{ id: string }> };

export default async function SampleTripDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (role && role !== "dispatch_editor" && role !== "admin") {
    redirect(homePathForRole(role, username));
  }
  const canEditTrip = canEditDispatchTrip(role, username);

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id).lean();
  if (!trip) notFound();

  const tripOrderIds = trip.orderIds ?? [];
  const pickerQuery =
    tripOrderIds.length > 0
      ? { $or: [readySampleOrdersMongoFilter(), { _id: { $in: tripOrderIds } }] }
      : readySampleOrdersMongoFilter();

  const [orderDocs, linkedOrders, fleetOptions] = await Promise.all([
    Order.find(pickerQuery)
      .sort({ createdAt: -1 })
      .select({ poNumber: 1, customerName: 1, dispatchTripId: 1, "dispatch.dcNo": 1 })
      .lean(),
    Order.find({ _id: { $in: tripOrderIds } })
      .select({ poNumber: 1, customerName: 1, gateDeliveryStatus: 1, "dispatch.dcNo": 1 })
      .lean(),
    loadDispatchFleetOptions(),
  ]);

  const orders: PickerOrder[] = orderDocs.map((o) => ({
    id: o._id.toString(),
    poNumber: o.poNumber,
    customerName: o.customerName,
    dispatchTripId: o.dispatchTripId ? o.dispatchTripId.toString() : null,
    dcNo: (o as { dispatch?: { dcNo?: string } }).dispatch?.dcNo?.trim() ?? "",
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

  const initialOrderIds = tripOrderIds.map((oid) => oid.toString());
  const tripChallanMap = new Map(
    ((trip as { orderChallans?: Array<{ orderId: { toString(): string }; dcNo?: string }> }).orderChallans ?? [])
      .map((row) => [row.orderId.toString(), row.dcNo?.trim() ?? ""]),
  );
  const initialOrderChallans = initialOrderIds.map((orderId) => ({
    orderId,
    dcNo: tripChallanMap.get(orderId) || initialDispatch.dcNo,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sample trip</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Vehicle {trip.vehicleNo?.trim() || "—"} · {initialOrderIds.length} sample
            {initialOrderIds.length !== 1 ? "s" : ""}
          </p>
        </div>
        {linkedOrders.length > 0 ? (
          <Link
            href={`/dispatch/sample-trips/${id}/loading-sheet`}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Combined loading sheet
          </Link>
        ) : null}
      </div>

      {linkedOrders.length > 0 ? (
        <ul className="space-y-2">
          {linkedOrders.map((o) => {
            const gateStatus = normalizeGateStatus(o.gateDeliveryStatus);
            return (
              <li
                key={o._id.toString()}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
              >
                <span className="text-sm font-medium text-zinc-900">
                  {o.poNumber} — {o.customerName}
                </span>
                <span className="text-xs text-zinc-500">{GATE_STATUS_LABELS[gateStatus]}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {canEditTrip ? (
        <DispatchTripForm
          tripId={id}
          initialOrderIds={initialOrderIds}
          orders={orders}
          initialDispatch={initialDispatch}
          initialOrderChallans={initialOrderChallans}
          vehicleOptions={fleetOptions.vehicles}
          driverOptions={fleetOptions.drivers}
          tripKind="sample"
          basePath="/dispatch/sample-trips"
        />
      ) : null}
    </div>
  );
}
