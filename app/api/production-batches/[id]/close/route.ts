import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { roundLiters } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { validateBatchClose } from "@/lib/productionBatchClose";
import { loadBatchUsageContext, usageForProductionBatch } from "@/lib/productionBatchStatus";
import { canEditProductionBatches, roleFromSession } from "@/lib/roles";

type RouteCtx = { params: Promise<{ id: string }> };

function serializeClosedBatch(batch: {
  _id: mongoose.Types.ObjectId;
  batchNo: string;
  productName: string;
  totalLiters: number;
  closedAt?: Date | null;
  closedByName?: string | null;
  closureWasteLiters?: number | null;
  closureWasteNote?: string | null;
  closureUsedLitersSnapshot?: number | null;
  closureRemainingLitersSnapshot?: number | null;
}) {
  return {
    id: batch._id.toString(),
    batchNo: batch.batchNo,
    productName: batch.productName,
    totalLiters: batch.totalLiters,
    closedAt: batch.closedAt,
    closedByName: batch.closedByName ?? "",
    closureWasteLiters: batch.closureWasteLiters,
    closureWasteNote: batch.closureWasteNote ?? "",
    closureUsedLitersSnapshot: batch.closureUsedLitersSnapshot,
    closureRemainingLitersSnapshot: batch.closureRemainingLitersSnapshot,
  };
}

export async function POST(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditProductionBatches(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    wasteLiters?: unknown;
    note?: unknown;
    confirmed?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wasteLiters =
    typeof body.wasteLiters === "number" ? body.wasteLiters : Number(body.wasteLiters);
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const confirmed = body.confirmed === true;

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id);
  if (!batch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { usedMap, catalog } = await loadBatchUsageContext();
  const usage = usageForProductionBatch(batch, usedMap, catalog);

  const validation = validateBatchClose({
    batch,
    remainingLiters: usage.remainingLiters,
    wasteLiters,
    confirmed,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const waste = roundLiters(wasteLiters);
  batch.closedAt = new Date();
  batch.closedByUserId = userId;
  batch.closedByName = session.user.name ?? "";
  batch.closureWasteLiters = waste;
  batch.closureWasteNote = note;
  batch.closureUsedLitersSnapshot = usage.usedLiters;
  batch.closureRemainingLitersSnapshot = usage.remainingLiters;
  await batch.save();

  return NextResponse.json(serializeClosedBatch(batch));
}
