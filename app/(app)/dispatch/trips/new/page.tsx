import { redirect } from "next/navigation";

import { DispatchTripForm } from "@/components/DispatchTripForm";
import type { PickerOrder } from "@/components/DispatchTripOrderPicker";
import { mergeOrderFilter } from "@/lib/customerAccountAccess";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { loadDispatchFleetOptions } from "@/lib/dispatchFleetOptions";
import { Order } from "@/lib/models/Order";
import { tripPlannerOrdersMongoFilter } from "@/lib/orderApproval";
import { canCreateDispatchTrips, EMPTY_DISPATCH, roleFromSession } from "@/lib/roles";

type PageProps = {
  searchParams: Promise<{ orderIds?: string }>;
};

export default async function NewDispatchTripPage(props: PageProps) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canCreateDispatchTrips(role, username)) {
    redirect("/dispatch/trips");
  }

  const { orderIds: orderIdsParam } = await props.searchParams;
  const preselected =
    typeof orderIdsParam === "string"
      ? orderIdsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  await connectToDatabase();
  const [orderDocs, fleetOptions] = await Promise.all([
    Order.find(await mergeOrderFilter(tripPlannerOrdersMongoFilter()))
      .sort({ createdAt: -1 })
      .select({ poNumber: 1, customerName: 1, dispatchTripId: 1, "dispatch.dcNo": 1 })
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">New dispatch trip</h1>
        <p className="mt-1 text-sm text-zinc-600">Pick POs and enter vehicle details once for the whole truck.</p>
      </div>
      <DispatchTripForm
        initialOrderIds={preselected}
        orders={orders}
        initialDispatch={EMPTY_DISPATCH}
        vehicleOptions={fleetOptions.vehicles}
        driverOptions={fleetOptions.drivers}
      />
    </div>
  );
}
