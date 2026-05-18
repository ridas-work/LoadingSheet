import { NextResponse } from "next/server";

import { buildAdminOrderSummary } from "@/lib/adminOrderSummary";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const pendingOnly = url.searchParams.get("pendingOnly") === "true";

  await connectToDatabase();

  const [orders, catalog] = await Promise.all([
    Order.find({})
      .sort({ createdAt: 1 })
      .select({
        poNumber: 1,
        customerName: 1,
        city: 1,
        deadlineDate: 1,
        dispatchTripId: 1,
        dispatch: 1,
        items: 1,
        orderKind: 1,
        mixedSample: 1,
      })
      .lean(),
    ProductPacking.find({ active: true })
      .sort({ name: 1 })
      .select({ code: 1, name: 1, aliases: 1, batchFamily: 1, summaryLabel: 1 })
      .lean(),
  ]);

  const summary = buildAdminOrderSummary(
    orders.map((o) => ({
      poNumber: o.poNumber,
      customerName: o.customerName,
      city: o.city,
      deadlineDate: o.deadlineDate,
      dispatchTripId: o.dispatchTripId,
      dispatch: o.dispatch,
      items: o.items,
      orderKind: o.orderKind,
      mixedSample: o.mixedSample,
    })),
    catalog.map((p) => ({
      code: p.code,
      name: p.name,
      aliases: p.aliases ?? [],
      batchFamily: p.batchFamily ?? "",
      summaryLabel: p.summaryLabel ?? "",
    })),
    { pendingOnly },
  );

  return NextResponse.json(summary);
}
