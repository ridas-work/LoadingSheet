import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { employeeById } from "@/lib/productionEmployees";
import { syncProductionEmployeesFromDisk } from "@/lib/productionEmployeesStore";
import { RashidDailyPlan } from "@/lib/models/RashidDailyPlan";
import {
  applyStatusUpdates,
  buildPlanView,
  buildWorkRowsForMorningPlan,
  parseDutyAssignments,
  parsePlanDate,
  parseWorkRowInputs,
  previousCalendarDate,
  serializePlanListItem,
  todayPlanDateIso,
} from "@/lib/rashidDailyPlan";
import { isAdmin, roleFromSession } from "@/lib/roles";

function dayRange(isoDate: string): { start: Date; end: Date } | null {
  const start = parsePlanDate(isoDate);
  if (!start) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function findPlanByIsoDate(isoDate: string) {
  const range = dayRange(isoDate);
  if (!range) return null;
  return RashidDailyPlan.findOne({
    planDate: { $gte: range.start, $lt: range.end },
  });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const listMode = url.searchParams.get("list") === "1";

  await connectToDatabase();

  if (listMode) {
    const docs = await RashidDailyPlan.find({}).sort({ planDate: -1 }).limit(60).lean();
    return NextResponse.json({
      plans: docs.map((d) => serializePlanListItem(d as Parameters<typeof serializePlanListItem>[0])),
    });
  }

  const isoDate = (url.searchParams.get("date") ?? todayPlanDateIso()).trim();
  if (!parsePlanDate(isoDate)) {
    return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
  }

  const existing = await findPlanByIsoDate(isoDate);
  const prevIso = previousCalendarDate(isoDate);
  const previous = prevIso ? await findPlanByIsoDate(prevIso) : null;

  return NextResponse.json({
    plan: buildPlanView(isoDate, existing, previous),
    saved: Boolean(existing),
  });
}

/** Morning plan — targets, helper, duties (status stays 0). */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string })?.id ?? "";
  const userName = session.user.name ?? "";

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isoDate = typeof body.date === "string" ? body.date.trim() : "";
  const range = dayRange(isoDate);
  if (!range) {
    return NextResponse.json({ errors: { date: "Valid date (YYYY-MM-DD) is required." } }, { status: 400 });
  }

  await connectToDatabase();
  syncProductionEmployeesFromDisk();
  const existing = await findPlanByIsoDate(isoDate);
  if (existing?.dayStatus === "closed") {
    return NextResponse.json(
      { errors: { form: "This day is already closed. View the saved record instead." } },
      { status: 400 },
    );
  }

  const errors: Record<string, string> = {};

  const helperEmployeeIdRaw =
    typeof body.helperEmployeeId === "string" ? body.helperEmployeeId.trim() : "";
  const helperEmployeeIds = Array.isArray(body.helperEmployeeIds)
    ? body.helperEmployeeIds.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];
  const helperEmployeeId = helperEmployeeIdRaw || helperEmployeeIds[0]?.trim() || "";
  const helper = employeeById(helperEmployeeId);
  if (!helper) {
    errors.helperEmployeeId = "Helper of the day is required.";
  }

  const parsedRows = parseWorkRowInputs(body.workRows);
  if (parsedRows.errors) Object.assign(errors, parsedRows.errors);
  if (!parsedRows.rows?.length && !parsedRows.errors) {
    errors.workRows = "Add at least one work row.";
  }

  const parsedDuties = parseDutyAssignments({
    boxMaking: body.boxMaking,
    machineCleaning: body.machineCleaning,
    hallOrganization: body.hallOrganization,
  });
  if (parsedDuties.errors) Object.assign(errors, parsedDuties.errors);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const prevIso = previousCalendarDate(isoDate);
  const previous = prevIso ? await findPlanByIsoDate(prevIso) : null;
  const built = buildWorkRowsForMorningPlan(parsedRows.rows!, previous);
  if ("errors" in built) {
    return NextResponse.json({ errors: built.errors }, { status: 400 });
  }

  const payload = {
    planDate: range.start,
    helperEmployeeId: helper!.id,
    helperName: helper!.name,
    workRows: built.rows,
    duties: parsedDuties.duties!,
    dayStatus: "planned" as const,
    recordedByUserId: userId,
    recordedByName: userName,
  };

  let doc;
  if (existing) {
    existing.helperEmployeeId = payload.helperEmployeeId;
    existing.helperName = payload.helperName;
    existing.set("workRows", payload.workRows);
    existing.duties = payload.duties;
    existing.dayStatus = "planned";
    existing.recordedByUserId = payload.recordedByUserId;
    existing.recordedByName = payload.recordedByName;
    await existing.save();
    doc = existing;
  } else {
    doc = await RashidDailyPlan.create(payload);
  }

  return NextResponse.json({
    plan: buildPlanView(isoDate, doc, previous),
    saved: true,
    redirectTo: `/admin/rashid-daily-plan/${isoDate}`,
  });
}

/** End of day — status + carry-forward only. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
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
  const existing = await findPlanByIsoDate(isoDate);
  if (!existing) {
    return NextResponse.json(
      { errors: { form: "Save the morning plan first before recording end-of-day status." } },
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
  const previous = prevIso ? await findPlanByIsoDate(prevIso) : null;
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
    redirectTo: `/admin/rashid-daily-plan/${isoDate}`,
  });
}
