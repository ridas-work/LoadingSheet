import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import {
  accumulateBatchUsageFromOrders,
  effectiveBatchDefsForOrder,
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  poolToBatchDefs,
  productsMatch,
  validateAndComputeWeights,
  type CatalogProduct,
  type VolumeSheetLine,
} from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { roleFromSession } from "@/lib/roles";

type AssignmentInput = { boxNo?: unknown; batchNo?: unknown };

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "dispatch_editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { assignments?: unknown } | null;
  if (!body || !Array.isArray(body.assignments)) {
    return NextResponse.json({ error: "assignments array is required" }, { status: 400 });
  }

  const assignmentMap = new Map<number, string>();
  for (const raw of body.assignments as AssignmentInput[]) {
    const boxNo = typeof raw.boxNo === "number" ? raw.boxNo : Number(raw.boxNo);
    if (!Number.isInteger(boxNo) || boxNo < 1) continue;
    assignmentMap.set(boxNo, typeof raw.batchNo === "string" ? normalizeBatchNo(raw.batchNo) : "");
  }

  await connectToDatabase();

  const [order, allOrders, poolDocs, catalogDocs] = await Promise.all([
    Order.findById(id),
    Order.find({}).select({ sheetLines: 1 }).lean(),
    ProductionBatch.find({}).lean(),
    ProductPacking.find({ active: true }).select({ name: 1, litersPerBottle: 1, aliases: 1 }).lean(),
  ]);

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const catalog: CatalogProduct[] = catalogDocs.map((p) => ({
    name: p.name,
    litersPerBottle: inferLitersPerBottleFromName(p.name, p.litersPerBottle),
    aliases: p.aliases ?? [],
  }));

  const pool = poolDocs.map((p) => ({
    batchNo: p.batchNo,
    productName: p.productName,
    totalLiters: p.totalLiters,
  }));

  const poolByKey = new Map(
    pool.map((p) => [normalizeBatchNo(p.batchNo).toLowerCase(), p]),
  );

  const volumeLines: VolumeSheetLine[] = (order.sheetLines ?? []).map((line) => ({
    boxNo: line.boxNo,
    productName: line.productName,
    bottlesPerBox: line.bottlesPerBox,
    batchNo: assignmentMap.has(line.boxNo)
      ? (assignmentMap.get(line.boxNo) ?? "")
      : (line.batchNo ?? ""),
  }));

  for (const line of volumeLines) {
    const batchNo = normalizeBatchNo(line.batchNo);
    if (!batchNo) continue;

    const batch = poolByKey.get(batchNo.toLowerCase());
    if (!batch) {
      return NextResponse.json({ error: `Unknown batch "${batchNo}".` }, { status: 400 });
    }
    if (!productsMatch(batch.productName, line.productName, catalog)) {
      return NextResponse.json(
        {
          error: `Batch "${batchNo}" is for ${batch.productName}, not ${line.productName} (box ${line.boxNo}).`,
        },
        { status: 400 },
      );
    }
  }

  const usedElsewhere = accumulateBatchUsageFromOrders(allOrders, catalog, id);
  const effectiveDefs = effectiveBatchDefsForOrder(poolToBatchDefs(pool), usedElsewhere);

  const validation = validateAndComputeWeights(volumeLines, effectiveDefs, catalog);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  for (const line of order.sheetLines ?? []) {
    const batchNo = assignmentMap.has(line.boxNo)
      ? (assignmentMap.get(line.boxNo) ?? "")
      : (line.batchNo ?? "");
    line.batchNo = batchNo;
    line.weight = validation.weights.get(line.boxNo) ?? null;
  }

  order.batchUpdatedByUserId = userId;
  order.batchUpdatedByName = session.user.name ?? "";
  order.batchUpdatedAt = new Date();
  await order.save();

  return NextResponse.json({ ok: true });
}
