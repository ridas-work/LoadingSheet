import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import {
  canAccessFieldVisits,
  defaultVisitKindForUser,
  fieldVisitsMongoFilter,
  isEmptyFieldVisitDraft,
  isFieldVisitRep,
  parseVisitKind,
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
      : fieldVisitsMongoFilter(username);

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

  const list = tickets
    .map((t) => serializeTicket(t as Parameters<typeof serializeTicket>[0]))
    .filter((t) => scopeAll || isAdmin(role) || !isEmptyFieldVisitDraft(t));

  const followUpReminders = list.filter((t) => t.needsFollowUp).length;

  return NextResponse.json({
    tickets: list,
    repPoints: Object.entries(repPoints).map(([username, v]) => ({ username, ...v })),
    followUpReminders,
  });
}

/** Create an empty draft ticket — rep fills customer info on the detail page. */
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

  await connectToDatabase();

  const visitKind = defaultVisitKindForUser(username);

  const created = await FieldVisitTicket.create({
    visitKind,
    placeName: "",
    customerName: "",
    status: "active",
    sampleMode: "none",
    visitLogs: [],
    ...(visitKind === "market_audit"
      ? {
          marketVisitDate: new Date(),
          marketVisitRows: [],
          marketVisitRemarks: "",
        }
      : {}),
    createdByUserId: new mongoose.Types.ObjectId(userId),
    createdByName: name,
    createdByUsername: username.toLowerCase(),
  });

  return NextResponse.json(
    { id: created._id.toString(), ticket: serializeTicket(created) },
    { status: 201 },
  );
}
