import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import {
  effectiveSampleApprovalStatus,
  parseSampleMode,
  serializeTicket,
} from "@/lib/fieldVisitTickets";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { Order } from "@/lib/models/Order";
import { isAdmin, roleFromSession } from "@/lib/roles";
import { restoreSampleProductionForVisit } from "@/lib/sampleProductionStock";
import { buildSampleOrderFromVisit } from "@/lib/sampleOrderFromVisit";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  await connectToDatabase();
  const ticket = await FieldVisitTicket.findById(id);
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (effectiveSampleApprovalStatus(ticket) !== "pending") {
    return NextResponse.json({ error: "This sample request is not pending approval." }, { status: 400 });
  }

  const now = new Date();
  const reviewer = session.user.name ?? "Waleed";

  if (action === "approve") {
    ticket.sampleApprovalStatus = "approved";
    ticket.sampleApprovedAt = now;
    ticket.sampleApprovedByName = reviewer;
    ticket.sampleRejectionNote = "";

    // Outgoing samples become a dispatch order for Rashid — separate from regular POs.
    if (parseSampleMode(ticket.sampleMode) === "outgoing") {
      const alreadyLinked =
        ticket.sampleDispatchOrderId &&
        (await Order.exists({ _id: ticket.sampleDispatchOrderId }));
      if (!alreadyLinked) {
        const payload = buildSampleOrderFromVisit(ticket);
        if (payload.items.length > 0) {
          const order = await Order.create({
            poNumber: payload.poNumber,
            customerName: payload.customerName,
            city: payload.city,
            orderKind: payload.orderKind,
            fieldVisitTicketId: payload.fieldVisitTicketId,
            sampleRepName: payload.sampleRepName,
            items: payload.items,
            sheetLines: payload.sheetLines,
            approvalStatus: "approved",
            approvedAt: now,
            approvedByName: reviewer,
            createdByName: payload.sampleRepName || reviewer,
          });
          ticket.sampleDispatchOrderId = order._id;
          ticket.linkedOrderId = order._id;
          ticket.linkedPoNumber = order.poNumber;
          ticket.sampleDispatchStatus = "awaiting_batches";
        }
      }
    }
  } else {
    // Reject — drop the pending sample order if batches were never assigned.
    if (ticket.sampleDispatchOrderId) {
      const linked = await Order.findById(ticket.sampleDispatchOrderId);
      if (linked && !linked.sampleStockDeductedAt) {
        await linked.deleteOne();
        ticket.sampleDispatchOrderId = null;
        ticket.sampleDispatchStatus = "none";
      }
    }
    if (parseSampleMode(ticket.sampleMode) === "outgoing") {
      await restoreSampleProductionForVisit(ticket._id.toString());
    }
    ticket.sampleApprovalStatus = "rejected";
    ticket.sampleRejectionNote = note;
    ticket.sampleApprovedAt = null;
    ticket.sampleApprovedByName = "";
  }

  await ticket.save();
  return NextResponse.json({ ticket: serializeTicket(ticket) });
}
