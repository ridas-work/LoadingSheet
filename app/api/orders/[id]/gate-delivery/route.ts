import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import {
  assertGateTransition,
  gateDeliveryUpdateFields,
  GATE_STATUS_LABELS,
  normalizeGateStatus,
  parseGateDeliveryPatchBody,
} from "@/lib/gateDelivery";
import { Order } from "@/lib/models/Order";
import { canEditGateDelivery, roleFromSession } from "@/lib/roles";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditGateDelivery(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  const userName = session.user.name ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = parseGateDeliveryPatchBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await Order.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const from = normalizeGateStatus(existing.gateDeliveryStatus);
  const transitionError = assertGateTransition(from, parsed.status);
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const $set = gateDeliveryUpdateFields(parsed.status, { userId, userName });
  const doc = await Order.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = normalizeGateStatus(doc.gateDeliveryStatus);
  return NextResponse.json({
    order: {
      id: doc._id.toString(),
      gateDeliveryStatus: status,
      gateStatusLabel: GATE_STATUS_LABELS[status],
      gateOutAt: doc.gateOutAt ?? null,
      gateDeliveredAt: doc.gateDeliveredAt ?? null,
      gatePendingAt: doc.gatePendingAt ?? null,
      gateUpdatedAt: doc.gateUpdatedAt ?? null,
      gateUpdatedByName: doc.gateUpdatedByName ?? "",
    },
  });
}
