import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { mergeOrderFilter } from "@/lib/customerAccountAccess";
import { connectToDatabase } from "@/lib/db";
import {
  gateEligibleMongoFilter,
  GATE_STATUS_LABELS,
  normalizeGateStatus,
} from "@/lib/gateDelivery";
import { normalizeClosureForDisplay } from "@/lib/gateDeliveryClosure";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import type { DeductionSheetLine } from "@/lib/packagingDeduction";
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

  const catalogDocs = await ProductPacking.find({ active: true })
    .select({ code: 1, name: 1, bottlesPerCarton: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
    .lean();
  const catalog = packingCatalogFromDocs(catalogDocs);

  const docs = await Order.find(await mergeOrderFilter({ $and: [base, statusFilter] }))
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
      deliveryOutcome: 1,
      orderClosedAt: 1,
      deliveryClosureLines: 1,
      deliveryLateReturns: 1,
      sheetLines: 1,
    })
    .lean();

  const orders = docs.map((d) => {
    const status = normalizeGateStatus(d.gateDeliveryStatus);
    const dispatch = d.dispatch ?? {};
    const closure = normalizeClosureForDisplay(
      {
        deliveryOutcome: d.deliveryOutcome,
        orderClosedAt: d.orderClosedAt,
        orderClosedByName: d.orderClosedByName,
        deliveryClosureLines: (d.deliveryClosureLines ?? []).map((l) => ({
          productCode: l.productCode,
          productName: l.productName,
          dispatchedBottles: l.dispatchedBottles,
          deliveredBottles: l.deliveredBottles,
          damagedBottles: l.damagedBottles,
          returnedBottles: l.returnedBottles,
        })),
        deliveryLateReturns: (d.deliveryLateReturns ?? []).map((r) => ({
          note: r.note ?? "",
          recordedAt: r.recordedAt,
          recordedByName: r.recordedByName,
          lines: (r.lines ?? []).map((l) => ({
            productCode: l.productCode,
            productName: l.productName,
            damagedBottles: l.damagedBottles,
            returnedBottles: l.returnedBottles,
          })),
        })),
        sheetLines: (d.sheetLines ?? []) as DeductionSheetLine[],
      },
      catalog,
    );
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
      deliveryOutcome: d.deliveryOutcome ?? null,
      deliveredBottles: closure.totals.displayDeliveredBottles,
      damagedBottles: closure.totals.damagedBottles,
      returnedBottles: closure.totals.returnedBottles,
    };
  });

  return NextResponse.json({ orders, filter });
}
