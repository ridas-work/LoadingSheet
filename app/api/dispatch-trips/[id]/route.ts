import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import {
  assertOrdersAvailableForTrip,
  clearDispatchTripIdOnOrders,
  parseOrderIds,
  syncTripDispatchToOrders,
  trimDispatchBody,
} from "@/lib/dispatchTripSync";
import { connectToDatabase } from "@/lib/db";
import { GATE_STATUS_LABELS, isRashidActiveGateStatus, normalizeGateStatus } from "@/lib/gateDelivery";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { canDiscardDispatchTrip, canEditDispatchTrip, roleFromSession } from "@/lib/roles";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id).lean();
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const orders = await Order.find({ _id: { $in: trip.orderIds ?? [] } })
    .select({ poNumber: 1, customerName: 1 })
    .lean();

  return NextResponse.json({
    id: trip._id.toString(),
    vehicleNo: trip.vehicleNo ?? "",
    driverName: trip.driverName ?? "",
    dcNo: trip.dcNo ?? "",
    helperName: trip.helperName ?? "",
    productionIncharge: trip.productionIncharge ?? "",
    securityName: trip.securityName ?? "",
    driverSignature: trip.driverSignature ?? "",
    orderIds: (trip.orderIds ?? []).map((oid) => oid.toString()),
    orders: orders.map((o) => ({
      id: o._id.toString(),
      poNumber: o.poNumber,
      customerName: o.customerName,
    })),
    dispatchedAt: trip.dispatchedAt,
    updatedAt: trip.updatedAt,
  });
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { role?: string; username?: string; id?: string; name?: string | null };
  const role = roleFromSession(user);
  if (!canEditDispatchTrip(role, user.username)) {
    return NextResponse.json({ error: "Only Ali can edit dispatch trips." }, { status: 403 });
  }

  const userId = user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prevOrderIds = (trip.orderIds ?? []).map((oid) => oid.toString());
  const nextOrderIds = body.orderIds !== undefined ? parseOrderIds(body.orderIds) : prevOrderIds;

  const conflict = await assertOrdersAvailableForTrip(nextOrderIds, id);
  if (conflict) {
    return NextResponse.json({ error: conflict }, { status: 400 });
  }

  const removed = prevOrderIds.filter((oid) => !nextOrderIds.includes(oid));
  if (removed.length > 0) {
    await clearDispatchTripIdOnOrders(
      removed.filter((oid) => mongoose.Types.ObjectId.isValid(oid)).map((oid) => new mongoose.Types.ObjectId(oid)),
    );
  }

  const fields = trimDispatchBody({ ...trip.toObject(), ...body });
  trip.set({
    ...fields,
    orderIds: nextOrderIds,
    dispatchedAt: trip.dispatchedAt ?? new Date(),
  });
  await trip.save();

  await syncTripDispatchToOrders(trip, { userId, userName: user.name ?? "" });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { role?: string; username?: string };
  const role = roleFromSession(user);
  if (!canDiscardDispatchTrip(role, user.username)) {
    return NextResponse.json({ error: "Only Ali can discard dispatch trips." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const linkedOrders = await Order.find({ _id: { $in: trip.orderIds ?? [] } })
    .select({ poNumber: 1, gateDeliveryStatus: 1 })
    .lean();
  const inactiveOrder = linkedOrders.find((order) => !isRashidActiveGateStatus(order.gateDeliveryStatus));
  if (inactiveOrder) {
    const status = normalizeGateStatus(inactiveOrder.gateDeliveryStatus);
    return NextResponse.json(
      {
        error: `Cannot discard this trip because PO ${inactiveOrder.poNumber} is ${GATE_STATUS_LABELS[status]}. Linked POs must still be active at the factory.`,
      },
      { status: 400 },
    );
  }

  await clearDispatchTripIdOnOrders(trip.orderIds ?? []);
  await trip.deleteOne();

  return NextResponse.json({ ok: true });
}
