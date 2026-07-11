import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { validateApprovedCustomerName, mergeOrderFilter } from "@/lib/customerAccountAccess";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { initialApprovalStatusForPoCreator } from "@/lib/orderApproval";
import { notDiscardedOrdersMongoFilter } from "@/lib/orderDiscard";
import { poCreatorOrdersMongoFilter } from "@/lib/orderAccess";
import { parseOrderBody, type OrderBody } from "@/lib/orderPayload";
import { roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const userId = (session.user as { id?: string }).id;
  const filter = await mergeOrderFilter(
    role === "po_creator" && userId
      ? poCreatorOrdersMongoFilter(userId)
      : notDiscardedOrdersMongoFilter(),
  );

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .select("_id poNumber customerName createdAt sheetLines")
    .lean();

  const list = orders.map((o) => {
    const lines = o.sheetLines ?? [];
    const total = lines.length;
    const filled = lines.filter((l) => {
      if (l.lineKind === "mixed_sample") {
        const comps = l.componentBatches ?? [];
        return comps.length > 0 && comps.every((c) => c.batchNo?.trim());
      }
      return typeof l.batchNo === "string" && l.batchNo.trim().length > 0;
    }).length;
    return {
      id: o._id.toString(),
      poNumber: o.poNumber,
      customerName: o.customerName,
      createdAt: o.createdAt,
      batchProgress: { filled, total },
    };
  });

  return NextResponse.json({ orders: list });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "po_creator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as OrderBody | null;
  const parsed = parseOrderBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  const { payload } = parsed;

  await connectToDatabase();

  const customerCheck = await validateApprovedCustomerName(payload.customerName);
  if (!customerCheck.ok) {
    return NextResponse.json({ errors: { customerName: customerCheck.error } }, { status: 400 });
  }

  const existing = await Order.findOne({
    poNumber: payload.poNumber.trim(),
    ...notDiscardedOrdersMongoFilter(),
  }).select("_id");
  if (existing) {
    return NextResponse.json(
      {
        errors: {
          poNumber:
            "An order with this PO number already exists. Open Orders and edit the existing PO instead of creating a duplicate.",
        },
      },
      { status: 400 },
    );
  }

  const approvalStatus = initialApprovalStatusForPoCreator();
  const now = new Date();
  const created = await Order.create({
    poNumber: payload.poNumber,
    customerName: payload.customerName,
    city: payload.city,
    deadlineDate: payload.deadlineDate,
    orderKind: payload.orderKind,
    mixedSample: payload.mixedSample,
    customCartons: payload.customCartons,
    items: payload.items,
    sheetLines: payload.sheetLines,
    createdByUserId: userId,
    createdByName: session.user.name ?? "",
    approvalStatus,
    approvalRequestedAt: approvalStatus === "pending" ? now : null,
  });

  return NextResponse.json({ id: created._id.toString() }, { status: 200 });
}
