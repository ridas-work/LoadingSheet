import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { closeTicketWon, isFieldVisitRep } from "@/lib/fieldVisitTickets";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { Order } from "@/lib/models/Order";
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

  const orders = await Order.find({})
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
  const username = (session.user as { username?: string })?.username;

  await connectToDatabase();

  let visitTicket = null;
  if (payload.visitTicketId) {
    if (!isFieldVisitRep(username)) {
      return NextResponse.json(
        { errors: { visitTicketId: "Only field reps can link a visit ticket." } },
        { status: 403 },
      );
    }
    if (!mongoose.Types.ObjectId.isValid(payload.visitTicketId)) {
      return NextResponse.json(
        { errors: { visitTicketId: "Invalid visit ticket id." } },
        { status: 400 },
      );
    }
    visitTicket = await FieldVisitTicket.findById(payload.visitTicketId);
    if (!visitTicket) {
      return NextResponse.json(
        { errors: { visitTicketId: "Visit ticket not found." } },
        { status: 400 },
      );
    }
    if (visitTicket.createdByUserId.toString() !== userId) {
      return NextResponse.json(
        { errors: { visitTicketId: "You can only link your own visit tickets." } },
        { status: 403 },
      );
    }
    if (visitTicket.status !== "visit_concluded") {
      return NextResponse.json(
        {
          errors: {
            visitTicketId: "Visit must be concluded before creating a PO from it.",
          },
        },
        { status: 400 },
      );
    }
    if (visitTicket.linkedOrderId) {
      return NextResponse.json(
        { errors: { visitTicketId: "This visit ticket is already linked to an order." } },
        { status: 400 },
      );
    }
  }

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
  });

  if (visitTicket) {
    try {
      await closeTicketWon(visitTicket, created._id, payload.poNumber);
    } catch (e) {
      await Order.findByIdAndDelete(created._id);
      return NextResponse.json(
        {
          errors: {
            visitTicketId: e instanceof Error ? e.message : "Could not link visit ticket.",
          },
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(
    {
      id: created._id.toString(),
      visitTicketClosed: visitTicket ? true : undefined,
      pointsAwarded: visitTicket?.pointsAwarded,
    },
    { status: 200 },
  );
}
