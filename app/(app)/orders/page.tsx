import { OrdersListWithTrips } from "@/components/OrdersListWithTrips";
import { PageHeader } from "@/components/PageHeader";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { normalizeGateStatus, rashidActiveOrdersMongoFilter } from "@/lib/gateDelivery";
import { Order } from "@/lib/models/Order";
import { tripPlannerOrdersMongoFilter } from "@/lib/orderApproval";
import { notDiscardedOrdersMongoFilter } from "@/lib/orderDiscard";
import {
  canAssignDispatchBatches,
  canEditOrders,
  isAdmin,
  isDispatchTripPlanner,
  roleFromSession,
} from "@/lib/roles";

export default async function OrdersPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  const isDispatchEditor = role === "dispatch_editor";
  const isTripPlanner = isDispatchTripPlanner(role, username);
  const canAssignBatches = canAssignDispatchBatches(role, username);
  const showEnteredBy = isAdmin(role);
  const editOrders = canEditOrders(role, username);

  const query = isTripPlanner
    ? tripPlannerOrdersMongoFilter()
    : isDispatchEditor
      ? rashidActiveOrdersMongoFilter()
      : notDiscardedOrdersMongoFilter();

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
      <PageHeader
        title="Orders"
        description={
          isTripPlanner
            ? "Approved factory orders ready for trip planning. Select multiple POs to create a vehicle trip."
            : canAssignBatches
              ? "Active factory orders only — out for delivery and delivered POs are hidden. Open loading sheets to assign batches."
              : "Open the loading sheet for any order."
        }
      />

      {rows.length === 0 ? (
        <p className="empty-state">
          {isDispatchEditor
            ? "No active orders at the factory. POs that are out for delivery or delivered are hidden — open Dispatch trips for trip history."
            : "No orders yet."}
        </p>
      ) : (
        <OrdersListWithTrips
          orders={rows}
          canPlanTrips={isTripPlanner}
          canAssignBatches={canAssignBatches}
          showEnteredBy={showEnteredBy}
          canEditOrders={editOrders}
          showGateStatus={showEnteredBy || role === "po_creator"}
        />
      )}
    </div>
  );
}
