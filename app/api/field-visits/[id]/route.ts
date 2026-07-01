import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { upsertCustomerDirectory } from "@/lib/customerDirectoryStore";
import { connectToDatabase } from "@/lib/db";
import {
  assertActionAllowed,
  canAccessFieldVisits,
  canEditFieldVisit,
  closeTicketLost,
  effectiveSampleApprovalStatus,
  followUpDueFromDelivery,
  normalizeTicketStatus,
  parseSampleFeedback,
  parseSampleMode,
  parseSampleProducts,
  serializeTicket,
  type TicketAction,
  visitLogCount,
} from "@/lib/fieldVisitTickets";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import {
  collectProductNamesFromSampleList,
  persistCustomProductNames,
} from "@/lib/persistCustomProductNames";
import { roleFromSession } from "@/lib/roles";
import { deductSampleProduction, samplePoolForCatalog } from "@/lib/sampleProductionStock";

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

  const catalogDocs = await ProductPacking.find({ active: true })
    .select({ code: 1, name: 1, bottlesPerCarton: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1 })
    .lean();
  const catalog = packingCatalogFromDocs(catalogDocs);
  const sampleStock = await samplePoolForCatalog(catalog);

  return NextResponse.json({ ticket: serializeTicket(ticket), sampleStock });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  const userId = (session.user as { id?: string })?.id ?? "";
  const userName = session.user.name ?? "";
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

  const status = normalizeTicketStatus(ticket.status);
  const sampleMode = parseSampleMode(ticket.sampleMode) ?? "none";
  const logCount = visitLogCount(ticket);
  const sampleApprovalStatus = effectiveSampleApprovalStatus(ticket);

  const block = assertActionAllowed(status, action, {
    sampleMode,
    visitLogCount: logCount,
    sampleApprovalStatus,
  });
  if (block) {
    return NextResponse.json({ error: block }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  if (action === "update_profile") {
    const placeName = typeof body.placeName === "string" ? body.placeName.trim() : "";
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    if (!placeName) errors.placeName = "Place / shop name is required.";
    if (!customerName) errors.customerName = "Customer name is required.";

    const nextMode = parseSampleMode(body.sampleMode) ?? sampleMode;
    const sampleProducts = parseSampleProducts(body.sampleProducts);

    if (Object.keys(errors).length === 0) {
      if (nextMode === "none") {
        ticket.sampleDeliveredAt = null;
        ticket.sampleReceivedAt = null;
        ticket.set("sampleProducts", []);
      } else {
        ticket.set("sampleProducts", sampleProducts);
      }

      ticket.placeName = placeName;
      ticket.customerName = customerName;
      ticket.city = typeof body.city === "string" ? body.city.trim() : "";
      ticket.contactPhone = typeof body.contactPhone === "string" ? body.contactPhone.trim() : "";
      ticket.contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
      ticket.notes = typeof body.notes === "string" ? body.notes.trim() : "";
      ticket.sampleMode = nextMode;
      if (ticket.status === "sample_requested" || ticket.status === "sample_delivered") {
        ticket.status = "active";
      }

      await persistCustomProductNames(collectProductNamesFromSampleList(sampleProducts), {
        userId,
        name: userName,
      });
      if (customerName) {
        await upsertCustomerDirectory(customerName, { userId, name: userName });
      }
    }
  } else if (action === "request_sample_approval") {
    const placeName = typeof body.placeName === "string" ? body.placeName.trim() : ticket.placeName ?? "";
    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : ticket.customerName ?? "";
    if (!placeName) errors.placeName = "Place / shop name is required.";
    if (!customerName) errors.customerName = "Customer name is required.";

    const nextMode = parseSampleMode(body.sampleMode) ?? sampleMode;
    if (nextMode === "none") {
      errors.sampleMode = "Choose “We send sample” or “Customer gave sample” before requesting.";
    }
    const sampleProducts = parseSampleProducts(body.sampleProducts);
    if (nextMode !== "none" && sampleProducts.length === 0) {
      errors.sampleProducts = "Enter at least one sample product.";
    }

    if (Object.keys(errors).length === 0) {
      ticket.placeName = placeName;
      ticket.customerName = customerName;
      ticket.city = typeof body.city === "string" ? body.city.trim() : ticket.city ?? "";
      ticket.contactPhone =
        typeof body.contactPhone === "string" ? body.contactPhone.trim() : ticket.contactPhone ?? "";
      ticket.contactPerson =
        typeof body.contactPerson === "string" ? body.contactPerson.trim() : ticket.contactPerson ?? "";
      ticket.notes = typeof body.notes === "string" ? body.notes.trim() : ticket.notes ?? "";
      ticket.sampleMode = nextMode;
      ticket.set("sampleProducts", sampleProducts);
      ticket.sampleApprovalStatus = "pending";
      ticket.sampleApprovalRequestedAt = new Date();
      ticket.sampleRequestedAt = new Date();
      ticket.sampleApprovedAt = null;
      ticket.sampleApprovedByName = "";
      ticket.sampleRejectionNote = "";
      ticket.sampleDeliveredAt = null;
      ticket.sampleReceivedAt = null;
      ticket.followUpDueAt = null;

      await persistCustomProductNames(collectProductNamesFromSampleList(sampleProducts), {
        userId,
        name: userName,
      });
      if (customerName) {
        await upsertCustomerDirectory(customerName, { userId, name: userName });
      }
    }
  } else if (action === "record_sample_event") {
    const mode = parseSampleMode(ticket.sampleMode) ?? "none";
    if (mode === "none") {
      return NextResponse.json({ error: "Set sample mode before recording a sample event." }, { status: 400 });
    }
    if (effectiveSampleApprovalStatus(ticket) !== "approved") {
      return NextResponse.json(
        { error: "Waleed must approve the sample request before you record delivery and reaction." },
        { status: 400 },
      );
    }

    if (mode === "outgoing" && ticket.sampleDeliveredAt) {
      return NextResponse.json(
        { error: "Sample delivery was already recorded for this visit." },
        { status: 400 },
      );
    }

    const eventDate =
      typeof body.eventDate === "string" && body.eventDate.trim()
        ? new Date(body.eventDate.trim())
        : new Date();
    if (Number.isNaN(eventDate.getTime())) {
      errors.eventDate = "Invalid date.";
    } else if (mode === "outgoing") {
      const catalogDocs = await ProductPacking.find({ active: true })
        .select({ code: 1, name: 1, bottlesPerCarton: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1 })
        .lean();
      const catalog = packingCatalogFromDocs(catalogDocs);
      const products = (ticket.sampleProducts ?? []).map((p) => ({
        productName: p.productName,
        bottles: typeof p.bottles === "number" && p.bottles >= 1 ? p.bottles : 1,
      }));
      const deduct = await deductSampleProduction({
        products,
        visitTicketId: ticket._id.toString(),
        actor: { userName, username: username ?? "" },
        catalog,
      });
      if (!deduct.ok) {
        return NextResponse.json({ error: deduct.error }, { status: 400 });
      }

      const feedback = parseSampleFeedback(body.sampleFeedback) ?? "pending";
      const comments = typeof body.feedbackComments === "string" ? body.feedbackComments.trim() : "";
      ticket.sampleFeedback = feedback;
      ticket.feedbackComments = comments;
      ticket.sampleDeliveredAt = eventDate;
      ticket.followUpDueAt = followUpDueFromDelivery(eventDate);
    } else {
      const feedback = parseSampleFeedback(body.sampleFeedback) ?? "pending";
      const comments = typeof body.feedbackComments === "string" ? body.feedbackComments.trim() : "";
      ticket.sampleFeedback = feedback;
      ticket.feedbackComments = comments;
      ticket.sampleReceivedAt = eventDate;
    }
  } else if (action === "add_visit") {
    if (!ticket.placeName?.trim() || !ticket.customerName?.trim()) {
      errors.profile =
        "Enter and save customer details (place and customer name) before logging a visit.";
    }
    const visitDateRaw = typeof body.visitDate === "string" ? body.visitDate.trim() : "";
    const conclusion = typeof body.conclusion === "string" ? body.conclusion.trim() : "";
    if (!visitDateRaw) errors.visitDate = "Visit date is required.";
    if (!conclusion) errors.conclusion = "Visit conclusion is required.";
    if (Object.keys(errors).length === 0) {
      const visitDate = new Date(visitDateRaw);
      if (Number.isNaN(visitDate.getTime())) {
        errors.visitDate = "Invalid visit date.";
      } else {
        if (!ticket.visitLogs) {
          ticket.set("visitLogs", []);
        }
        ticket.visitLogs!.push({
          visitDate,
          conclusion,
          recordedAt: new Date(),
          recordedByName: userName,
        });
        if (ticket.status === "sample_requested" || ticket.status === "sample_delivered") {
          ticket.status = "active";
        }
      }
    }
  } else if (action === "final_conclude") {
    const finalConclusion =
      typeof body.finalConclusion === "string" ? body.finalConclusion.trim() : "";
    if (!finalConclusion) {
      errors.finalConclusion = "Final conclusion is required.";
    } else if (visitLogCount(ticket) < 1) {
      errors.finalConclusion = "Add at least one visit before final conclusion.";
    } else {
      ticket.finalConclusion = finalConclusion;
      ticket.visitConcludedAt = new Date();
      ticket.status = "visit_concluded";
    }
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
