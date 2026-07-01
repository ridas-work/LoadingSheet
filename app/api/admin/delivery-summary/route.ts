import { NextResponse } from "next/server";

import { buildAdminDeliverySummary } from "@/lib/adminDeliverySummary";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { canViewAdminSummary, roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canViewAdminSummary(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .select({
      poNumber: 1,
      customerName: 1,
      gateDeliveryStatus: 1,
      gateDeliveredAt: 1,
      discardedAt: 1,
      items: 1,
      subtractedItems: 1,
    })
    .lean();

  const summary = buildAdminDeliverySummary(
    orders.map((o) => ({
      _id: o._id,
      poNumber: o.poNumber,
      customerName: o.customerName,
      gateDeliveryStatus: o.gateDeliveryStatus,
      gateDeliveredAt: o.gateDeliveredAt,
      discardedAt: o.discardedAt,
      items: o.items?.map((it) => ({
        productName: it.productName,
        boxes: it.boxes,
        bottlesPerBox: it.bottlesPerBox,
      })),
      subtractedItems: (o.subtractedItems ?? []).map((item) => ({
        _id: item._id?.toString(),
        productName: item.productName,
        boxes: item.boxes,
        bottlesPerBox: item.bottlesPerBox,
        status: item.status,
        subtractedAt: item.subtractedAt,
        subtractedByName: item.subtractedByName ?? "",
        carriedOutAt: item.carriedOutAt,
        discardedAt: item.discardedAt,
      })),
    })),
  );

  return NextResponse.json(summary);
}
