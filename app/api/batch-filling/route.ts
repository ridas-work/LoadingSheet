import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { computeVariance, parseNonNegativeLiters, todayIsoDate } from "@/lib/batchFillingWaste";
import { roundLiters } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { BatchFillingDailyEntry } from "@/lib/models/BatchFillingDailyEntry";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { canEditDispatch, isAdmin, roleFromSession } from "@/lib/roles";
import {
  loadBatchUsageContext,
  usageForBatchNo,
} from "@/lib/productionBatchStatus";

function canView(role: ReturnType<typeof roleFromSession>): boolean {
  return role === "dispatch_editor" || isAdmin(role);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date")?.trim() || todayIsoDate();

  await connectToDatabase();

  const [batches, { usedMap }, entries] = await Promise.all([
    ProductionBatch.find({}).sort({ preparedAt: -1 }).lean(),
    loadBatchUsageContext(),
    BatchFillingDailyEntry.find({ entryDate: date }).lean(),
  ]);

  const entryByBatch = new Map(entries.map((e) => [e.batchNo.toLowerCase(), e]));

  const rows = batches
    .map((b) => {
      const usage = usageForBatchNo(b.batchNo, b.totalLiters, usedMap);
      if (usage.status === "empty" && !entryByBatch.has(b.batchNo.toLowerCase())) {
        return null; // hide fully-used batches with no entry today
      }
      const entry = entryByBatch.get(b.batchNo.toLowerCase());
      return {
        batchNo: b.batchNo,
        productName: b.productName,
        totalLiters: b.totalLiters,
        usedLiters: usage.usedLiters,
        systemRemainingLiters: usage.remainingLiters,
        status: usage.status,
        entry: entry
          ? {
              filledLitersToday: entry.filledLitersToday,
              readyToDeliverLiters: entry.readyToDeliverLiters,
              physicalRemainingLiters: entry.physicalRemainingLiters,
              systemRemainingLiters: entry.systemRemainingLiters,
              wasteLiters: entry.wasteLiters,
              note: entry.note ?? "",
              recordedByName: entry.recordedByName ?? "",
              updatedAt: entry.updatedAt?.toISOString() ?? null,
            }
          : null,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ date, rows });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditDispatch(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    batchNo?: unknown;
    entryDate?: unknown;
    filledLitersToday?: unknown;
    readyToDeliverLiters?: unknown;
    physicalRemainingLiters?: unknown;
    note?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const batchNo = typeof body.batchNo === "string" ? body.batchNo.trim() : "";
  const entryDate = typeof body.entryDate === "string" ? body.entryDate.trim() : todayIsoDate();
  if (!batchNo) return NextResponse.json({ error: "batchNo is required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate))
    return NextResponse.json({ error: "entryDate must be YYYY-MM-DD" }, { status: 400 });

  const filled = parseNonNegativeLiters(body.filledLitersToday, "Filled today");
  if (typeof filled === "object") return NextResponse.json({ error: filled.error }, { status: 400 });

  const ready = parseNonNegativeLiters(body.readyToDeliverLiters, "Ready to deliver");
  if (typeof ready === "object") return NextResponse.json({ error: ready.error }, { status: 400 });

  const physical = parseNonNegativeLiters(body.physicalRemainingLiters, "Physical remaining");
  if (typeof physical === "object") return NextResponse.json({ error: physical.error }, { status: 400 });

  const note = typeof body.note === "string" ? body.note.trim() : "";

  await connectToDatabase();

  const batch = await ProductionBatch.findOne({ batchNo }).lean();
  if (!batch) return NextResponse.json({ error: `Batch "${batchNo}" not found` }, { status: 404 });

  const { usedMap } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batchNo, batch.totalLiters, usedMap);
  const systemRemaining = roundLiters(usage.remainingLiters);
  const wasteLiters = computeVariance(systemRemaining, physical);

  const result = await BatchFillingDailyEntry.findOneAndUpdate(
    { batchNo, entryDate },
    {
      $set: {
        filledLitersToday: filled,
        readyToDeliverLiters: ready,
        physicalRemainingLiters: physical,
        systemRemainingLiters: systemRemaining,
        wasteLiters,
        note,
        recordedByUserId: userId,
        recordedByName: session.user.name ?? "",
      },
    },
    { upsert: true, new: true },
  );

  return NextResponse.json({
    entry: {
      batchNo: result.batchNo,
      entryDate: result.entryDate,
      filledLitersToday: result.filledLitersToday,
      readyToDeliverLiters: result.readyToDeliverLiters,
      physicalRemainingLiters: result.physicalRemainingLiters,
      systemRemainingLiters: result.systemRemainingLiters,
      wasteLiters: result.wasteLiters,
      note: result.note ?? "",
    },
  });
}
