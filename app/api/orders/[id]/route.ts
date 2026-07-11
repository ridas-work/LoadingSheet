import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { validateApprovedCustomerName } from "@/lib/customerAccountAccess";
import { connectToDatabase } from "@/lib/db";
import { isOrderLockedAfterDelivery, normalizeGateStatus } from "@/lib/gateDelivery";
import { Order } from "@/lib/models/Order";
import { notDiscardedOrdersMongoFilter } from "@/lib/orderDiscard";
import { mergeStandardAndCustomSheetLines } from "@/lib/hybridSheetLines";
import { parseOrderBody, type OrderBody } from "@/lib/orderPayload";
import { canEditOwnOrder } from "@/lib/orderAccess";
import {
  computeBossEditSubtractions,
  hasSubtractionFromEdit,
} from "@/lib/subtractedItems";
import { preserveSheetBatches } from "@/lib/preserveSheetBatches";
import { isAdmin, roleFromSession } from "@/lib/roles";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = roleFromSession(session.user as { role?: string });
  const userId = (session.user as { id?: string }).id;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  await connectToDatabase();
  const doc = await Order.findById(id).lean();
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role === "po_creator" && !canEditOwnOrder(role, userId, doc)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(doc);
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = roleFromSession(session.user as { role?: string });
  const userId = (session.user as { id?: string }).id;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as OrderBody | null;
  const parsed = parseOrderBody(body, { allowEmptyItems: true });
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await Order.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canEditOwnOrder(role, userId, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isOrderLockedAfterDelivery(normalizeGateStatus(existing.gateDeliveryStatus))) {
    return NextResponse.json(
      { error: "This order was delivered and cannot be edited." },
      { status: 403 },
    );
  }

  const duplicate = await Order.findOne({
    _id: { $ne: existing._id },
    poNumber: parsed.payload.poNumber,
    ...notDiscardedOrdersMongoFilter(),
    // Allow multiple orders with the same poNumber when some are created
    // automatically from boss-subtracted items.
    subtractedFromOrderId: null,
  }).select("_id");
  if (duplicate) {
    return NextResponse.json(
      { errors: { poNumber: "Another order with this PO number already exists." } },
      { status: 400 },
    );
  }

  const customerCheck = await validateApprovedCustomerName(parsed.payload.customerName);
  if (!customerCheck.ok) {
    return NextResponse.json({ errors: { customerName: customerCheck.error } }, { status: 400 });
  }

  const oldLines = (existing.sheetLines ?? []) as Parameters<typeof preserveSheetBatches>[0];
  const sheetLines = preserveSheetBatches(oldLines, parsed.payload.sheetLines);

  const now = new Date();
  let pendingSubtractionOrderId: string | null = null;

  const subtraction = computeBossEditSubtractions({
    oldKind: existing.orderKind,
    nextKind: parsed.payload.orderKind,
    beforeLines: oldLines,
    afterLines: parsed.payload.sheetLines,
    beforeMixedContents: (existing.mixedSample?.contents ?? []) as Array<{
      productName: string;
      bottles: number;
    }>,
    afterMixedContents: (parsed.payload.mixedSample?.contents ?? []) as Array<{
      productName: string;
      bottles: number;
    }>,
  });

  const hasAnySubtraction = isAdmin(role) && hasSubtractionFromEdit(subtraction);

  existing.set({
    poNumber: parsed.payload.poNumber,
    customerName: parsed.payload.customerName,
    city: parsed.payload.city,
    deadlineDate: parsed.payload.deadlineDate,
    orderKind: parsed.payload.orderKind,
    items: parsed.payload.items,
    mixedSample: parsed.payload.mixedSample,
    customCartons: parsed.payload.customCartons,
    sheetLines,
    adminEditedAt: new Date(),
    adminEditedByName: session.user.name ?? "",
  });

  await existing.save();

  if (hasAnySubtraction) {
    const pendingSheetLines = mergeStandardAndCustomSheetLines(
      subtraction.standardItems,
      subtraction.customCartons,
    );
    const pendingOrderKind: "standard" | "hybrid" =
      subtraction.customCartons.length > 0 ? "hybrid" : "standard";
    const parentOrderId = existing._id.toString();

    const pendingPayload = {
      poNumber: parsed.payload.poNumber,
      customerName: parsed.payload.customerName,
      city: parsed.payload.city,
      deadlineDate: parsed.payload.deadlineDate,
      orderKind: pendingOrderKind,
      items: subtraction.standardItems.map((i) => ({
        productName: i.productName,
        boxes: i.boxes,
        bottlesPerBox: i.bottlesPerBox,
      })),
      mixedSample: null,
      customCartons: subtraction.customCartons,
      sheetLines: pendingSheetLines,
      approvalStatus: "pending" as const,
      approvalRequestedAt: now,
      subtractedFromOrderId: parentOrderId,
    };

    const priorPending = await Order.findOne({
      subtractedFromOrderId: parentOrderId,
      approvalStatus: "pending",
      discardedAt: null,
    });

    if (priorPending) {
      priorPending.set(pendingPayload);
      await priorPending.save();
      pendingSubtractionOrderId = priorPending._id.toString();
    } else {
      const pendingOrder = await Order.create({
        ...pendingPayload,
        createdByUserId: userId ?? null,
        createdByName: session.user.name ?? "",
      });
      pendingSubtractionOrderId = pendingOrder._id.toString();
    }
  }

  return NextResponse.json({
    id: existing._id.toString(),
    pendingSubtractionOrderId,
  });
}
