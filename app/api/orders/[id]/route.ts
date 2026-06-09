import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { isOrderLockedAfterDelivery, normalizeGateStatus } from "@/lib/gateDelivery";
import { parseOrderBody, type OrderBody } from "@/lib/orderPayload";
import { preserveSheetBatches } from "@/lib/preserveSheetBatches";
import { canEditOrders, roleFromSession } from "@/lib/roles";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  await connectToDatabase();
  const doc = await Order.findById(id).lean();
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditOrders(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as OrderBody | null;
  const parsed = parseOrderBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await Order.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isOrderLockedAfterDelivery(normalizeGateStatus(existing.gateDeliveryStatus))) {
    return NextResponse.json(
      { error: "This order was delivered and cannot be edited." },
      { status: 403 },
    );
  }

  const { payload } = parsed;
  const oldLines = (existing.sheetLines ?? []) as Parameters<typeof preserveSheetBatches>[0];
  const sheetLines = preserveSheetBatches(oldLines, payload.sheetLines);

  existing.set({
    poNumber: payload.poNumber,
    customerName: payload.customerName,
    city: payload.city,
    deadlineDate: payload.deadlineDate,
    orderKind: payload.orderKind,
    items: payload.items,
    mixedSample: payload.mixedSample,
    customCartons: payload.customCartons,
    sheetLines,
  });
  existing.adminEditedAt = new Date();
  existing.adminEditedByName = session.user.name ?? "";

  await existing.save();

  return NextResponse.json({ id: existing._id.toString() });
}
