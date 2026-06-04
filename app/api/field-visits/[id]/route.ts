import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import {
  assertActionAllowed,
  canAccessFieldVisits,
  canEditFieldVisit,
  closeTicketLost,
  followUpDueFromDelivery,
  parseSampleFeedback,
  serializeTicket,
  type TicketAction,
} from "@/lib/fieldVisitTickets";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { roleFromSession } from "@/lib/roles";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!canAccessFieldVisits(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();
  const ticket = await FieldVisitTicket.findById(id);
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = (session.user as { id?: string })?.id ?? "";
  if (!canEditFieldVisit(role, username, ticket, userId) && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ticket: serializeTicket(ticket) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  const userId = (session.user as { id?: string })?.id ?? "";
  if (!canAccessFieldVisits(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const action = body.action as TicketAction;

  await connectToDatabase();
  const ticket = await FieldVisitTicket.findById(id);
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canEditFieldVisit(role, username, ticket, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const block = assertActionAllowed(ticket.status, action);
  if (block) {
    return NextResponse.json({ error: block }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  if (action === "deliver_sample") {
    const deliveredAt =
      typeof body.sampleDeliveredAt === "string" && body.sampleDeliveredAt.trim()
        ? new Date(body.sampleDeliveredAt.trim())
        : new Date();
    if (Number.isNaN(deliveredAt.getTime())) {
      errors.sampleDeliveredAt = "Invalid delivery date.";
    } else {
      const feedback = parseSampleFeedback(body.sampleFeedback) ?? "pending";
      ticket.status = "sample_delivered";
      ticket.sampleDeliveredAt = deliveredAt;
      ticket.followUpDueAt = followUpDueFromDelivery(deliveredAt);
      ticket.sampleFeedback = feedback;
      ticket.feedbackComments =
        typeof body.feedbackComments === "string" ? body.feedbackComments.trim() : "";
      if (typeof body.customerName === "string" && body.customerName.trim()) {
        ticket.customerName = body.customerName.trim();
      }
      if (typeof body.city === "string") ticket.city = body.city.trim();
      if (typeof body.contactPhone === "string") ticket.contactPhone = body.contactPhone.trim();
      if (typeof body.contactPerson === "string") ticket.contactPerson = body.contactPerson.trim();
    }
  } else if (action === "record_follow_up") {
    const comments =
      typeof body.followUpComments === "string" ? body.followUpComments.trim() : "";
    if (!comments) {
      errors.followUpComments = "Follow-up comments are required.";
    } else {
      ticket.followUpComments = comments;
      ticket.followUpCompletedAt = new Date();
      const ff = parseSampleFeedback(body.followUpFeedback);
      if (ff) ticket.followUpFeedback = ff;
    }
  } else if (action === "conclude") {
    ticket.status = "visit_concluded";
    ticket.visitConcludedAt = new Date();
  } else if (action === "close_lost") {
    const reason = typeof body.closedReason === "string" ? body.closedReason.trim() : "";
    if (!reason) {
      errors.closedReason = "Reason is required when marking visit as lost.";
    } else {
      try {
        const closedBy =
          userId && mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : undefined;
        await closeTicketLost(ticket, reason, closedBy);
        return NextResponse.json({ ticket: serializeTicket(ticket) });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Could not close ticket" },
          { status: 400 },
        );
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  await ticket.save();
  return NextResponse.json({ ticket: serializeTicket(ticket) });
}
