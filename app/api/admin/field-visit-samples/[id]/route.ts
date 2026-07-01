import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { effectiveSampleApprovalStatus, serializeTicket } from "@/lib/fieldVisitTickets";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { isAdmin, roleFromSession } from "@/lib/roles";

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
  } else {
    ticket.sampleApprovalStatus = "rejected";
    ticket.sampleRejectionNote = note;
    ticket.sampleApprovedAt = null;
    ticket.sampleApprovedByName = "";
  }

  await ticket.save();
  return NextResponse.json({ ticket: serializeTicket(ticket) });
}
