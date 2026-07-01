import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { RashidDailyPlan } from "@/lib/models/RashidDailyPlan";
import {
  applyStatusUpdates,
  buildPlanView,
  parsePlanDate,
  previousCalendarDate,
  serializePlanListItem,
  todayPlanDateIso,
} from "@/lib/rashidDailyPlan";
import { findRashidDailyPlanByIsoDate } from "@/lib/rashidDailyPlanDb";
import { syncProductionEmployeesFromDisk } from "@/lib/productionEmployeesStore";
import {
  canRecordRashidDailyPlanStatus,
  canViewRashidDailyPlan,
  roleFromSession,
} from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!canViewRashidDailyPlan(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const listMode = url.searchParams.get("list") === "1";

  await connectToDatabase();
  syncProductionEmployeesFromDisk();

  if (listMode) {
    const docs = await RashidDailyPlan.find({}).sort({ planDate: -1 }).limit(14).lean();
    return NextResponse.json({
      plans: docs.map((d) => serializePlanListItem(d as Parameters<typeof serializePlanListItem>[0])),
    });
  }

  const isoDate = (url.searchParams.get("date") ?? todayPlanDateIso()).trim();
  if (!parsePlanDate(isoDate)) {
    return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
  }

  const existing = await findRashidDailyPlanByIsoDate(isoDate);
  const prevIso = previousCalendarDate(isoDate);
  const previous = prevIso ? await findRashidDailyPlanByIsoDate(prevIso) : null;

  return NextResponse.json({
    plan: buildPlanView(isoDate, existing, previous),
    saved: Boolean(existing),
  });
}

/** End of day — Rashid records status achieved per row. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!canRecordRashidDailyPlanStatus(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userName = session.user.name ?? "";
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isoDate = typeof body.date === "string" ? body.date.trim() : "";
  if (!parsePlanDate(isoDate)) {
    return NextResponse.json({ errors: { date: "Valid date is required." } }, { status: 400 });
  }

  await connectToDatabase();
  syncProductionEmployeesFromDisk();
  const existing = await findRashidDailyPlanByIsoDate(isoDate);
  if (!existing) {
    return NextResponse.json(
      { errors: { form: "No morning plan for this date yet. Waleed must save the plan first." } },
      { status: 400 },
    );
  }

  const statusByLineKey = new Map<string, number>();
  if (Array.isArray(body.statusRows)) {
    for (const row of body.statusRows) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const lineKey = typeof o.lineKey === "string" ? o.lineKey.trim() : "";
      if (!lineKey) continue;
      const status = Math.max(0, Math.round(Number(o.statusAchieved) || 0));
      statusByLineKey.set(lineKey, status);
    }
  }

  const prevIso = previousCalendarDate(isoDate);
  const previous = prevIso ? await findRashidDailyPlanByIsoDate(prevIso) : null;
  const built = applyStatusUpdates(existing, statusByLineKey, previous);
  if ("errors" in built) {
    return NextResponse.json({ errors: built.errors }, { status: 400 });
  }

  existing.set("workRows", built.rows);
  existing.dayStatus = "closed";
  existing.statusRecordedAt = new Date();
  existing.statusRecordedByName = userName;
  await existing.save();

  return NextResponse.json({
    plan: buildPlanView(isoDate, existing, previous),
    saved: true,
    redirectTo: `/dispatch/daily-plan/${isoDate}`,
  });
}
