import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import {
  canAccessFieldVisits,
  isFieldVisitRep,
  POINTS_LOST,
  POINTS_WON,
  serializeTicket,
} from "@/lib/fieldVisitTickets";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { isAdmin, roleFromSession } from "@/lib/roles";

function sessionUser(session: Awaited<ReturnType<typeof auth>>) {
  const user = session?.user as {
    id?: string;
    name?: string | null;
    username?: string;
    role?: string;
  } | undefined;
  return {
    id: user?.id ?? "",
    name: user?.name ?? "",
    username: user?.username ?? "",
    role: roleFromSession(user as { role?: string }),
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: userId, username, role } = sessionUser(session);
  if (!canAccessFieldVisits(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const scopeAll = url.searchParams.get("scope") === "all" && isAdmin(role);

  await connectToDatabase();

  const filter = scopeAll
    ? {}
    : isAdmin(role)
      ? {}
      : { createdByUserId: new mongoose.Types.ObjectId(userId) };

  const tickets = await FieldVisitTicket.find(filter).sort({ updatedAt: -1 }).lean();

  const repPoints: Record<string, { name: string; points: number; won: number; lost: number }> = {};
  for (const t of tickets) {
    const key = t.createdByUsername ?? "unknown";
    if (!repPoints[key]) {
      repPoints[key] = { name: t.createdByName ?? key, points: 0, won: 0, lost: 0 };
    }
    const pts = t.pointsAwarded ?? 0;
    if (t.status === "closed_won") {
      repPoints[key].won += 1;
      repPoints[key].points += pts > 0 ? pts : POINTS_WON;
    } else if (t.status === "closed_lost") {
      repPoints[key].lost += 1;
      repPoints[key].points += pts < 0 ? pts : POINTS_LOST;
    }
  }

  const list = tickets.map((t) =>
    serializeTicket(t as Parameters<typeof serializeTicket>[0]),
  );

  const followUpReminders = list.filter((t) => t.needsFollowUp).length;

  return NextResponse.json({
    tickets: list,
    repPoints: Object.entries(repPoints).map(([username, v]) => ({ username, ...v })),
    followUpReminders,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: userId, name, username, role } = sessionUser(session);
  if (!isFieldVisitRep(username) || role !== "po_creator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const placeName = typeof body.placeName === "string" ? body.placeName.trim() : "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const errors: Record<string, string> = {};
  if (!placeName) errors.placeName = "Place / shop name is required.";
  if (!customerName) errors.customerName = "Customer name is required.";
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const sampleProducts: { productName: string; notes: string }[] = [];
  if (Array.isArray(body.sampleProducts)) {
    for (const row of body.sampleProducts) {
      if (!row || typeof row !== "object") continue;
      const pn = typeof (row as { productName?: unknown }).productName === "string"
        ? (row as { productName: string }).productName.trim()
        : "";
      if (!pn) continue;
      const notes =
        typeof (row as { notes?: unknown }).notes === "string"
          ? (row as { notes: string }).notes.trim()
          : "";
      sampleProducts.push({ productName: pn, notes });
    }
  }

  await connectToDatabase();

  const created = await FieldVisitTicket.create({
    placeName,
    customerName,
    city: typeof body.city === "string" ? body.city.trim() : "",
    contactPhone: typeof body.contactPhone === "string" ? body.contactPhone.trim() : "",
    contactPerson: typeof body.contactPerson === "string" ? body.contactPerson.trim() : "",
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    sampleProducts,
    status: "sample_requested",
    sampleRequestedAt: new Date(),
    createdByUserId: new mongoose.Types.ObjectId(userId),
    createdByName: name,
    createdByUsername: username.toLowerCase(),
  });

  return NextResponse.json({ ticket: serializeTicket(created) }, { status: 201 });
}
