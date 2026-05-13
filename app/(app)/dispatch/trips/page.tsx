import Link from "next/link";

import { connectToDatabase } from "@/lib/db";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";

export default async function DispatchTripsPage() {
  await connectToDatabase();

  const trips = await DispatchTrip.find({}).sort({ updatedAt: -1 }).lean();
  const allOrderIds = trips.flatMap((t) => t.orderIds ?? []);
  const orders =
    allOrderIds.length > 0
      ? await Order.find({ _id: { $in: allOrderIds } })
          .select({ poNumber: 1 })
          .lean()
      : [];
  const poById = new Map(orders.map((o) => [o._id.toString(), o.poNumber]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Dispatch trips</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Group multiple POs on one vehicle. Enter vehicle and driver once; assign batches per PO on each loading
            sheet.
          </p>
        </div>
        <Link
          href="/dispatch/trips/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No trips yet. Create one to dispatch several POs on the same truck.
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
