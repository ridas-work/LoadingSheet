import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { isRashidActiveGateStatus, isTripActiveForPlanner, normalizeGateStatus } from "@/lib/gateDelivery";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { batchProgress } from "@/lib/orderBatchStatus";
import { regularTripsMongoFilter } from "@/lib/sampleDispatch";
import {
  canCreateDispatchTrips,
  canEditDispatchTrip,
  homePathForRole,
  isDispatchBatchOperator,
  isDispatchTripPlanner,
  roleFromSession,
} from "@/lib/roles";

export default async function DispatchTripsPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (role && role !== "dispatch_editor" && role !== "admin") {
    redirect(homePathForRole(role));
  }
  const canEditTrip = canEditDispatchTrip(role, username);
  const canCreate = canCreateDispatchTrips(role, username);
  const hideCompletedTrips = isDispatchTripPlanner(role, username) && role !== "admin";
  const rashidView = isDispatchBatchOperator(role, username) && role !== "admin";

  const allTrips = await DispatchTrip.find(regularTripsMongoFilter()).sort({ updatedAt: -1 }).lean();
  const allOrderIds = allTrips.flatMap((t) => t.orderIds ?? []);
  const orders =
    allOrderIds.length > 0
      ? await Order.find({ _id: { $in: allOrderIds } })
          .select({ poNumber: 1, gateDeliveryStatus: 1, sheetLines: 1 })
          .lean()
      : [];
  const poById = new Map(orders.map((o) => [o._id.toString(), o.poNumber]));
  const orderMetaById = new Map(
    orders.map((o) => {
      const progress = batchProgress(o.sheetLines);
      return [
        o._id.toString(),
        {
          gateStatus: normalizeGateStatus(o.gateDeliveryStatus),
          complete: progress.complete,
        },
      ];
    }),
  );

  const trips = allTrips.filter((t) => {
    const meta = (t.orderIds ?? [])
      .map((oid) => orderMetaById.get(oid.toString()))
      .filter((m): m is NonNullable<typeof m> => m !== undefined);
    if (hideCompletedTrips) {
      return isTripActiveForPlanner(meta.map((m) => m.gateStatus));
    }
    if (rashidView) {
      return meta.some((m) => isRashidActiveGateStatus(m.gateStatus) && !m.complete);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Dispatch trips</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {canEditTrip
              ? "Group multiple POs on one vehicle. Enter vehicle and driver once; assign batches per PO on each loading sheet."
              : rashidView
                ? "Pending batch-assignment trips only — delivered/out-for-delivery and fully assigned trips are hidden."
              : hideCompletedTrips
                ? "Active vehicle trips only — trips where every PO is out for delivery or delivered are hidden."
                : "View vehicle trips and linked POs (read-only)."}
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/dispatch/trips/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            New trip
          </Link>
        ) : null}
      </div>

      {trips.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          {hideCompletedTrips
            ? "No active trips. Delivered and out-for-delivery trips are hidden — create a new trip from Orders when POs are ready."
            : rashidView
              ? "No pending trips. Trips with delivered/out-for-delivery POs or fully assigned batches are hidden."
            : "No trips yet. Create one to dispatch several POs on the same truck."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {trips.map((t) => {
            const id = t._id.toString();
            const orderIdStrings = (t.orderIds ?? []).map((oid) => oid.toString());
            const poNumbers = orderIdStrings.map((oid) => poById.get(oid) ?? oid);
            const vehicle = t.vehicleNo?.trim() || "—";

            return (
              <li key={id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">Vehicle {vehicle}</p>
                    <p className="text-sm text-zinc-600">
                      {orderIdStrings.length} PO{orderIdStrings.length !== 1 ? "s" : ""}: {poNumbers.join(", ")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Updated {new Date(t.updatedAt).toLocaleString()}
                      {t.driverName ? ` · Driver ${t.driverName}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/dispatch/trips/${id}`}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                  >
                    Open trip
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
