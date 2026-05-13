import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { accumulateBatchUsageFromOrders, inferLitersPerBottleFromName, normalizeBatchNo } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { roleFromSession } from "@/lib/roles";

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
    const productName = typeof body.productName === "string" ? body.productName.trim() : "";
    if (!productName) {
      return NextResponse.json({ error: "Product is required" }, { status: 400 });
    }
    const catalogHit = await ProductPacking.findOne({
      active: true,
      $or: [{ name: productName }, { aliases: productName }],
    }).lean();
    if (!catalogHit) {
      return NextResponse.json({ error: "Product must exist in catalog" }, { status: 400 });
    }
    batch.productName = catalogHit.name;
  }

  if (body.totalLiters !== undefined) {
    const totalLiters =
      typeof body.totalLiters === "number" ? body.totalLiters : Number(body.totalLiters);
    if (!Number.isFinite(totalLiters) || totalLiters <= 0) {
      return NextResponse.json({ error: "Total liters must be greater than 0" }, { status: 400 });
    }
    batch.totalLiters = totalLiters;
  }

  if (body.notes !== undefined) {
    batch.notes = typeof body.notes === "string" ? body.notes.trim() : "";
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
    ProductPacking.find({ active: true }).select({ name: 1, litersPerBottle: 1, aliases: 1 }).lean(),
  ]);

  const catalog = catalogDocs.map((p) => ({
    name: p.name,
    litersPerBottle: inferLitersPerBottleFromName(p.name, p.litersPerBottle),
    aliases: p.aliases ?? [],
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
