import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { accumulateBatchUsageFromOrders, inferLitersPerBottleFromName, normalizeBatchNo } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { parseQcBody, resolveBatchFamily, trimQcField } from "@/lib/productionBatchApi";
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
    drum: batch.drum ?? "",
    quantity: batch.quantity ?? "",
    notes: batch.notes ?? "",
    createdByName: batch.createdByName ?? "",
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
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
    if (body.drum !== undefined) batch.drum = qc.fields.drum;
    if (body.quantity !== undefined) batch.quantity = qc.fields.quantity;
  }

  if (body.preparedAt !== undefined && typeof body.preparedAt === "string" && body.preparedAt) {
    batch.preparedAt = new Date(body.preparedAt);
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

  const [allOrders, catalogDocs] = await Promise.all([
    Order.find({}).select({ sheetLines: 1 }).lean(),
    ProductPacking.find({ active: true }).select({ name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1 }).lean(),
  ]);

  const catalog = catalogDocs.map((p) => ({
    name: p.name,
    litersPerBottle: inferLitersPerBottleFromName(p.name, p.litersPerBottle),
    aliases: p.aliases ?? [],
    batchFamily: p.batchFamily?.trim() || p.name,
  }));

  const usedMap = accumulateBatchUsageFromOrders(allOrders, catalog);
  const key = normalizeBatchNo(batch.batchNo).toLowerCase();
  const usedLiters = usedMap.get(key) ?? 0;

  if (usedLiters > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: batch "${batch.batchNo}" is already assigned on loading sheets (${usedLiters} L in use).`,
      },
      { status: 400 },
    );
  }

  await batch.deleteOne();
  return NextResponse.json({ ok: true });
}
