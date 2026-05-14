import { OrdersListWithTrips } from "@/components/OrdersListWithTrips";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { isAdmin, roleFromSession } from "@/lib/roles";

export default async function OrdersPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const isDispatchEditor = role === "dispatch_editor";
  const showEnteredBy = isAdmin(role);

  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .select("_id poNumber customerName createdAt createdByName sheetLines.batchNo dispatchTripId dispatch.vehicleNo")
    .lean();

  const rows = orders.map((o) => {
    const id = o._id.toString();
    const lines = o.sheetLines ?? [];
    const total = lines.length;
    const filled = lines.filter((l) => typeof l.batchNo === "string" && l.batchNo.trim().length > 0).length;
    const dispatch = (o as { dispatch?: { vehicleNo?: string } }).dispatch;

    return {
      id,
      poNumber: o.poNumber,
      customerName: o.customerName,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : "",
      createdByName: (o as { createdByName?: string }).createdByName?.trim() ?? "",
      filled,
      total,
      dispatchTripId: o.dispatchTripId ? o.dispatchTripId.toString() : null,
      vehicleNo: dispatch?.vehicleNo?.trim() ?? "",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Orders</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Open the loading sheet for any order.
          {isDispatchEditor ? " Select multiple POs to create a vehicle trip." : ""}
          {showEnteredBy ? " See who entered each PO." : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No orders yet.
        </p>
      ) : (
        <OrdersListWithTrips orders={rows} isDispatchEditor={isDispatchEditor} showEnteredBy={showEnteredBy} />
      )}
    </div>
  );
}
