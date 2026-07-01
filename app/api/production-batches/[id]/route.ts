import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { normalizeBatchNo } from "@/lib/batchVolume";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { isBatchClosed } from "@/lib/productionBatchClose";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { parseQcBody, parseProductionPurpose, resolveBatchFamily, trimQcField } from "@/lib/productionBatchApi";
import { renameProductionBatchNo, patchTouchesLockedFields } from "@/lib/renameProductionBatchNo";
import {
  isProductionBatchLocked,
  loadBatchUsageContext,
  usageForBatchNo,
} from "@/lib/productionBatchStatus";
import { roleFromSession } from "@/lib/roles";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id).lean();
  if (!batch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { usedMap, catalog } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batch.batchNo, batch.totalLiters, usedMap, batch.productName, catalog);

  return NextResponse.json({
    id: batch._id.toString(),
    batchNo: batch.batchNo,
    productName: batch.productName,
    totalLiters: batch.totalLiters,
    preparedAt: batch.preparedAt,
    ph: batch.ph ?? "",
    solids: batch.solids ?? "",
    appearance: batch.appearance ?? "",
    provider: batch.provider ?? "",
    hcl: batch.hcl ?? "",
    viscosity: batch.viscosity ?? "",
    quantity: batch.quantity ?? "",
    notes: batch.notes ?? "",
    createdByName: batch.createdByName ?? "",
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    ...usage,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "batch_editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id);
  if (!batch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isBatchClosed(batch)) {
    return NextResponse.json({ error: "Batch is closed and cannot be edited." }, { status: 403 });
  }

  const { usedMap, catalog } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batch.batchNo, batch.totalLiters, usedMap, batch.productName, catalog);
  const locked = isProductionBatchLocked(usage.usedLiters);
  const requestedBatchNo =
    typeof body.batchNo === "string" ? normalizeBatchNo(body.batchNo) : batch.batchNo;
  const renaming =
    typeof body.batchNo === "string" &&
    normalizeBatchNo(body.batchNo).toLowerCase() !== normalizeBatchNo(batch.batchNo).toLowerCase();

  if (locked) {
    if (!renaming) {
      return NextResponse.json(
        {
          error: `Batch "${batch.batchNo}" is locked — already assigned on loading sheets (${usage.usedLiters} L in use). Open Edit to correct the batch number only.`,
        },
        { status: 403 },
      );
    }
    if (patchTouchesLockedFields(body)) {
      return NextResponse.json(
        { error: "While this batch is in use, only the batch number can be changed." },
        { status: 400 },
      );
    }
    const renamed = await renameProductionBatchNo(
      batch._id.toString(),
      batch.batchNo,
      batch.productName,
      requestedBatchNo,
    );
    if (!renamed.ok) {
      return NextResponse.json({ error: renamed.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, batchNo: renamed.newBatchNo });
  }

  if (renaming) {
    const renamed = await renameProductionBatchNo(
      batch._id.toString(),
      batch.batchNo,
      batch.productName,
      requestedBatchNo,
    );
    if (!renamed.ok) {
      return NextResponse.json({ error: renamed.error }, { status: 400 });
    }
  }

  if (body.productName !== undefined) {
    const productInput = trimQcField(body.productName);
    if (!productInput) {
      return NextResponse.json({ error: "Product is required" }, { status: 400 });
    }
    const batchFamily = await resolveBatchFamily(productInput);
    if (!batchFamily) {
      return NextResponse.json({ error: "Product must exist in catalog" }, { status: 400 });
    }
    batch.productName = batchFamily;
  }

  if (body.totalLiters !== undefined) {
    const totalLiters =
      typeof body.totalLiters === "number" ? body.totalLiters : Number(body.totalLiters);
    if (!Number.isFinite(totalLiters) || totalLiters <= 0) {
      return NextResponse.json({ error: "Total liters must be greater than 0" }, { status: 400 });
    }
    batch.totalLiters = totalLiters;
  }

  const qc = parseQcBody(body, false);
  if (qc.ok) {
    if (body.ph !== undefined) batch.ph = qc.fields.ph;
    if (body.solids !== undefined) batch.solids = qc.fields.solids;
    if (body.appearance !== undefined) batch.appearance = qc.fields.appearance;
    if (body.provider !== undefined) batch.provider = qc.fields.provider;
    if (body.hcl !== undefined) batch.hcl = qc.fields.hcl;
    if (body.viscosity !== undefined) batch.viscosity = qc.fields.viscosity;
    if (body.quantity !== undefined) batch.quantity = qc.fields.quantity;
  }

  if (body.preparedAt !== undefined && typeof body.preparedAt === "string" && body.preparedAt) {
    batch.preparedAt = new Date(body.preparedAt);
  }

  if (body.productionPurpose !== undefined) {
    batch.productionPurpose = parseProductionPurpose(body.productionPurpose);
  }

  await batch.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "batch_editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id);
  if (!batch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { usedMap, catalog } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batch.batchNo, batch.totalLiters, usedMap, batch.productName, catalog);

  if (usage.usedLiters > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: batch "${batch.batchNo}" is already assigned on loading sheets (${usage.usedLiters} L in use).`,
      },
      { status: 400 },
    );
  }

  await batch.deleteOne();
  return NextResponse.json({ ok: true });
}
