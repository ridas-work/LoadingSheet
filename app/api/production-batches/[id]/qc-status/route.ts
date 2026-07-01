import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { normalizeQcOutcome, type ProductionBatchQcOutcome } from "@/lib/productionBatchQc";
import { isBatchClosed } from "@/lib/productionBatchClose";
import { isProductionBatchLocked, loadBatchUsageContext, usageForBatchNo } from "@/lib/productionBatchStatus";
import { roleFromSession } from "@/lib/roles";

type QcAction = "reject" | "approve" | "discard";

function serializeQc(batch: {
  qcOutcome?: string | null;
  qcComment?: string | null;
  qcStatusAt?: Date | null;
  qcStatusByName?: string | null;
  nimraWasteLiters?: number | null;
  totalLiters: number;
}) {
  const outcome = normalizeQcOutcome(batch.qcOutcome);
  return {
    qcOutcome: outcome,
    qcComment: batch.qcComment ?? "",
    qcStatusAt: batch.qcStatusAt,
    qcStatusByName: batch.qcStatusByName ?? "",
    nimraWasteLiters: batch.nimraWasteLiters,
    totalLiters: batch.totalLiters,
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  if (role !== "batch_editor" && role !== "dispatch_editor" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id).lean();
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serializeQc(batch));
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (roleFromSession(session.user as { role?: string }) !== "batch_editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    action?: unknown;
    comment?: unknown;
  } | null;
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "action is required (reject, approve, discard)" }, { status: 400 });
  }

  const action = body.action as QcAction;
  if (action !== "reject" && action !== "approve" && action !== "discard") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id);
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isBatchClosed(batch)) {
    return NextResponse.json({ error: "Batch is closed and cannot be changed." }, { status: 403 });
  }

  const current = normalizeQcOutcome(batch.qcOutcome);
  if (current === "discarded") {
    return NextResponse.json({ error: "This batch has been discarded and cannot be changed." }, { status: 400 });
  }

  const { usedMap, catalog } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batch.batchNo, batch.totalLiters, usedMap, batch.productName, catalog);
  if (isProductionBatchLocked(usage.usedLiters)) {
    return NextResponse.json(
      {
        error: `Batch "${batch.batchNo}" is locked — already assigned on loading sheets (${usage.usedLiters} L in use).`,
      },
      { status: 403 },
    );
  }

  let nextOutcome: ProductionBatchQcOutcome = current;

  if (action === "reject") {
    if (current !== "approved") {
      return NextResponse.json({ error: "Only approved batches can be marked unsuccessful." }, { status: 400 });
    }
    if (!comment) {
      return NextResponse.json({ error: "Enter the reason for rejection." }, { status: 400 });
    }
    nextOutcome = "rejected";
    batch.qcComment = comment;
  } else if (action === "approve") {
    if (current !== "rejected") {
      return NextResponse.json({ error: "Only unsuccessful batches can be approved." }, { status: 400 });
    }
    nextOutcome = "approved";
    batch.qcComment = "";
  } else if (action === "discard") {
    if (current !== "rejected") {
      return NextResponse.json(
        { error: "Only unsuccessful batches can be discarded. Mark unsuccessful first if QC failed." },
        { status: 400 },
      );
    }
    if (!comment) {
      return NextResponse.json({ error: "Enter why this batch is being discarded." }, { status: 400 });
    }
    nextOutcome = "discarded";
    batch.qcComment = comment;
    batch.nimraWasteLiters = batch.totalLiters;
    batch.nimraWasteNote = comment;
    batch.nimraWasteRecordedAt = new Date();
    batch.nimraWasteRecordedByUserId = userId;
    batch.nimraWasteRecordedByName = session.user.name ?? "";
  }

  batch.qcOutcome = nextOutcome;
  batch.qcStatusAt = new Date();
  batch.qcStatusByUserId = userId;
  batch.qcStatusByName = session.user.name ?? "";
  await batch.save();

  return NextResponse.json(serializeQc(batch));
}
