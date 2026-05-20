import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import {
  gateEligibleMongoFilter,
  GATE_STATUS_LABELS,
  normalizeGateStatus,
} from "@/lib/gateDelivery";
import { Order } from "@/lib/models/Order";
import { canViewGateOrders, roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canViewGateOrders(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "active";

  await connectToDatabase();

  const base = gateEligibleMongoFilter();
  let statusFilter: Record<string, unknown> = {};
  if (filter === "out") {
    statusFilter = { gateDeliveryStatus: "out_for_delivery" };
  } else if (filter === "pending") {
    statusFilter = { gateDeliveryStatus: "pending_redelivery" };
  } else if (filter === "delivered") {
    statusFilter = { gateDeliveryStatus: "delivered" };
  } else if (filter === "active") {
    statusFilter = { gateDeliveryStatus: { $ne: "delivered" } };
  }

  const docs = await Order.find({ $and: [base, statusFilter] })
    .sort({ updatedAt: -1 })
    .limit(200)
    .select({
      poNumber: 1,
      customerName: 1,
      city: 1,
      gateDeliveryStatus: 1,
      dispatchTripId: 1,
      dispatch: 1,
      gateOutAt: 1,
      gateDeliveredAt: 1,
      gatePendingAt: 1,
      gateUpdatedAt: 1,
      gateUpdatedByName: 1,
      updatedAt: 1,
    })
    .lean();

  const orders = docs.map((d) => {
    const status = normalizeGateStatus(d.gateDeliveryStatus);
    const dispatch = d.dispatch ?? {};
    return {
      id: d._id.toString(),
      poNumber: d.poNumber,
      customerName: d.customerName,
      city: d.city ?? "",
      gateDeliveryStatus: status,
      gateStatusLabel: GATE_STATUS_LABELS[status],
      dispatchTripId: d.dispatchTripId?.toString() ?? null,
      vehicleNo: dispatch.vehicleNo?.trim() ?? "",
      driverName: dispatch.driverName?.trim() ?? "",
      dcNo: dispatch.dcNo?.trim() ?? "",
      gateOutAt: d.gateOutAt ?? null,
      gateDeliveredAt: d.gateDeliveredAt ?? null,
      gatePendingAt: d.gatePendingAt ?? null,
      gateUpdatedAt: d.gateUpdatedAt ?? null,
      gateUpdatedByName: d.gateUpdatedByName ?? "",
    };
  });

  return NextResponse.json({ orders, filter });
}
