import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { sampleTripsMongoFilter } from "@/lib/sampleDispatch";
import { canCreateDispatchTrips, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function SampleTripsPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (role && role !== "dispatch_editor" && role !== "admin") {
    redirect(homePathForRole(role, username));
  }
  const canCreate = canCreateDispatchTrips(role, username);

  await connectToDatabase();
  const trips = await DispatchTrip.find(sampleTripsMongoFilter()).sort({ updatedAt: -1 }).lean();
  const allOrderIds = trips.flatMap((t) => t.orderIds ?? []);
  const orders =
    allOrderIds.length > 0
      ? await Order.find({ _id: { $in: allOrderIds } }).select({ poNumber: 1 }).lean()
      : [];
  const poById = new Map(orders.map((o) => [o._id.toString(), o.poNumber]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sample trips</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Vehicle trips for field visit sample dispatch only — kept separate from regular PO trips.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/dispatch/sample-trips/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            New sample trip
          </Link>
        ) : null}
      </div>

      {trips.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No sample trips yet. Create one once Rashid has assigned sample batches.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {trips.map((t) => {
            const id = t._id.toString();
            const orderIdStrings = (t.orderIds ?? []).map((oid) => oid.toString());
            const poNumbers = orderIdStrings.map((oid) => poById.get(oid) ?? oid);
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-900">Vehicle {t.vehicleNo?.trim() || "—"}</p>
                  <p className="text-sm text-zinc-600">
                    {orderIdStrings.length} sample{orderIdStrings.length !== 1 ? "s" : ""}: {poNumbers.join(", ")}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Updated {new Date(t.updatedAt).toLocaleString()}
                    {t.driverName ? ` · Driver ${t.driverName}` : ""}
                  </p>
                </div>
                <Link
                  href={`/dispatch/sample-trips/${id}`}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                >
                  Open trip
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
