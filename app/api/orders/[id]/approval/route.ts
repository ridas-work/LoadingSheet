import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { normalizeApprovalStatus, pendingApprovalMongoFilter, type ApprovalStatus } from "@/lib/orderApproval";
import { isAdmin, roleFromSession } from "@/lib/roles";

type ApprovalAction = "approve" | "reject";

function parseBody(raw: unknown):
  | { ok: true; action: ApprovalAction; note: string }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const action = (raw as { action?: unknown }).action;
  if (action !== "approve" && action !== "reject") {
    return { ok: false, error: 'action must be "approve" or "reject"' };
  }
  const noteRaw = (raw as { note?: unknown }).note;
  const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, 500) : "";
  return { ok: true, action, note };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const parsed = parseBody(await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await connectToDatabase();
  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.discardedAt && parsed.action === "approve") {
    return NextResponse.json({ error: "This order was discarded." }, { status: 400 });
  }

  const current = normalizeApprovalStatus(order.approvalStatus);
  const now = new Date();
  const userName = session.user.name ?? "";
  const poNumber = order.poNumber.trim();

  const siblings = await Order.find({
    ...pendingApprovalMongoFilter(),
    poNumber,
  });

  const targets = siblings.length > 0 ? siblings : [order];

  if (parsed.action === "approve") {
    if (current === "approved" && targets.every((o) => normalizeApprovalStatus(o.approvalStatus) === "approved")) {
      return NextResponse.json({ error: "Order is already approved" }, { status: 400 });
    }
    for (const target of targets) {
      if (target.discardedAt) {
        return NextResponse.json({ error: "This order was discarded." }, { status: 400 });
      }
      target.approvalStatus = "approved";
      target.approvedAt = now;
      target.approvedByUserId = userId;
      target.approvedByName = userName;
      target.rejectedAt = null;
      target.rejectedByUserId = null;
      target.rejectedByName = "";
      target.rejectionNote = "";
      await target.save();
    }
  } else {
    if (current === "rejected" && targets.every((o) => normalizeApprovalStatus(o.approvalStatus) === "rejected")) {
      return NextResponse.json({ error: "Order is already rejected" }, { status: 400 });
    }
    for (const target of targets) {
      target.approvalStatus = "rejected";
      target.rejectedAt = now;
      target.rejectedByUserId = userId;
      target.rejectedByName = userName;
      target.rejectionNote = parsed.note;

      // Boss subtraction pending POs are "discarded" permanently on reject.
      if (target.subtractedFromOrderId) {
        target.discardedAt = now;
        target.discardedByUserId = userId;
        target.discardedByName = userName;
      }
      await target.save();
    }
  }

  return NextResponse.json({
    id: order._id.toString(),
    approvalStatus: order.approvalStatus as ApprovalStatus,
    updatedCount: targets.length,
    poNumber,
  });
}
