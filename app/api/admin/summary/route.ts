import { NextResponse } from "next/server";

import { buildAdminOrderSummary, type SummaryOrderInput } from "@/lib/adminOrderSummary";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { notDiscardedOrdersMongoFilter } from "@/lib/orderDiscard";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { canViewAdminSummary, roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canViewAdminSummary(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const pendingOnly = url.searchParams.get("pendingOnly") !== "0";

  await connectToDatabase();

  const [catalogDocs, orders] = await Promise.all([
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, summaryLabel: 1, aliases: 1 })
      .lean(),
    Order.find(notDiscardedOrdersMongoFilter())
      .sort({ createdAt: -1 })
      .select({
        poNumber: 1,
        customerName: 1,
        city: 1,
        deadlineDate: 1,
        orderKind: 1,
        items: 1,
        mixedSample: 1,
        customCartons: 1,
        subtractedItems: 1,
        dispatchTripId: 1,
        dispatch: 1,
        gateDeliveryStatus: 1,
        approvalStatus: 1,
        discardedAt: 1,
      })
      .lean(),
  ]);

  const catalog = catalogDocs.map((p) => ({
    code: p.code,
    name: p.name,
    summaryLabel: p.summaryLabel ?? "",
    aliases: p.aliases ?? [],
  }));

  const summary = buildAdminOrderSummary(
    orders.map((o) => ({
      _id: o._id,
      poNumber: o.poNumber,
      customerName: o.customerName,
      city: o.city,
      deadlineDate: o.deadlineDate,
      orderKind: o.orderKind,
      items: o.items?.map((it) => ({
        productName: it.productName,
        boxes: it.boxes,
        bottlesPerBox: it.bottlesPerBox,
      })),
      mixedSample: o.mixedSample
        ? {
            boxCount: o.mixedSample.boxCount,
            contents: o.mixedSample.contents?.map((c) => ({
              productName: c.productName,
              bottles: c.bottles,
              bottleSizeCode: c.bottleSizeCode ?? undefined,
            })),
          }
        : null,
      customCartons: o.customCartons?.map((c) => ({
        boxCount: c.boxCount,
        label: c.label ?? undefined,
        customBoxCode: c.customBoxCode ?? undefined,
        contents: c.contents?.map((item) => ({
          productName: item.productName,
          bottles: item.bottles,
          bottleSizeCode: item.bottleSizeCode ?? undefined,
        })),
      })),
      subtractedItems: (o.subtractedItems ?? []).map((item) => ({
        productName: item.productName,
        boxes: item.boxes,
        bottlesPerBox: item.bottlesPerBox,
        status: item.status,
        subtractedAt: item.subtractedAt,
        subtractedByName: item.subtractedByName ?? "",
        batchNo: item.batchNo ?? "",
        carriedOutAt: item.carriedOutAt,
        discardedAt: item.discardedAt,
      })),
      dispatchTripId: o.dispatchTripId,
      dispatch: o.dispatch ?? undefined,
      gateDeliveryStatus: o.gateDeliveryStatus,
      approvalStatus: o.approvalStatus,
      discardedAt: o.discardedAt,
    })) as SummaryOrderInput[],
    catalog,
    { pendingOnly },
  );

  return NextResponse.json(summary);
}
