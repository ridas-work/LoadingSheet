import { OrdersListWithTrips } from "@/components/OrdersListWithTrips";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { normalizeGateStatus, rashidActiveOrdersMongoFilter } from "@/lib/gateDelivery";
import { Order } from "@/lib/models/Order";
import { canEditOrders, isAdmin, roleFromSession } from "@/lib/roles";

export default async function OrdersPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const isDispatchEditor = role === "dispatch_editor";
  const showEnteredBy = isAdmin(role);
  const editOrders = canEditOrders(role);

  const query = isDispatchEditor ? rashidActiveOrdersMongoFilter() : {};
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .select(
      "_id poNumber customerName createdAt createdByName sheetLines.batchNo dispatchTripId dispatch.vehicleNo gateDeliveryStatus",
    )
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
      gateDeliveryStatus: normalizeGateStatus(
        (o as { gateDeliveryStatus?: unknown }).gateDeliveryStatus,
      ),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Orders</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Open the loading sheet for any order.
          {isDispatchEditor
            ? " Active factory orders only — out for delivery and delivered POs are hidden. Select multiple POs to create a vehicle trip."
            : ""}
          {showEnteredBy ? " All POs including delivered — see status and who entered each PO." : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          {isDispatchEditor
            ? "No active orders at the factory. POs that are out for delivery or delivered are hidden — open Dispatch trips for trip history."
            : "No orders yet."}
        </p>
      ) : (
        <OrdersListWithTrips
          orders={rows}
          isDispatchEditor={isDispatchEditor}
          showEnteredBy={showEnteredBy}
          canEditOrders={editOrders}
          showGateStatus={showEnteredBy}
        />
      )}
    </div>
  );
}
