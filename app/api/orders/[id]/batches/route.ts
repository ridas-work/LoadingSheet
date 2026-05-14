import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import {
  inferLitersPerBottleFromName,
  normalizeBatchNo,
  validateAndComputeWeights,
  type BatchDef,
  type CatalogProduct,
  type VolumeSheetLine,
} from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { roleFromSession } from "@/lib/roles";

type BatchUpdate = { boxNo?: unknown; batchNo?: unknown };
type BatchDefInput = { batchNo?: unknown; totalLiters?: unknown };

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "batch_editor") {
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

  const body = (await req.json().catch(() => null)) as {
    batches?: unknown;
    batchDefs?: unknown;
  } | null;
  if (!body || !Array.isArray(body.batches)) {
    return NextResponse.json({ error: "batches array is required" }, { status: 400 });
  }

  const updates = new Map<number, string>();
  for (const raw of body.batches as BatchUpdate[]) {
    const boxNo = typeof raw.boxNo === "number" ? raw.boxNo : Number(raw.boxNo);
    if (!Number.isInteger(boxNo) || boxNo < 1) {
      return NextResponse.json({ error: "Each batch entry needs a valid boxNo" }, { status: 400 });
    }
    const batchNo = typeof raw.batchNo === "string" ? normalizeBatchNo(raw.batchNo) : "";
    updates.set(boxNo, batchNo);
  }

  const batchDefs: BatchDef[] = [];
  if (Array.isArray(body.batchDefs)) {
    for (const raw of body.batchDefs as BatchDefInput[]) {
      const batchNo = typeof raw.batchNo === "string" ? normalizeBatchNo(raw.batchNo) : "";
      const totalLiters = typeof raw.totalLiters === "number" ? raw.totalLiters : Number(raw.totalLiters);
      if (!batchNo) continue;
      if (!Number.isFinite(totalLiters) || totalLiters <= 0) {
        return NextResponse.json(
          { error: `Batch "${batchNo}" needs total liters greater than 0.` },
          { status: 400 },
        );
      }
      batchDefs.push({ batchNo, totalLiters });
    }
  }

  await connectToDatabase();

  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const catalogDocs = await ProductPacking.find({ active: true }).lean();
  const catalog: CatalogProduct[] = catalogDocs.map((p) => ({
    name: p.name,
    litersPerBottle: inferLitersPerBottleFromName(p.name, p.litersPerBottle),
    aliases: p.aliases ?? [],
    batchFamily: p.batchFamily?.trim() || p.name,
  }));

  const lines = order.sheetLines ?? [];
  const knownBoxNos = new Set(lines.map((l) => l.boxNo));

  for (const boxNo of updates.keys()) {
    if (!knownBoxNos.has(boxNo)) {
      return NextResponse.json({ error: `Unknown box number: ${boxNo}` }, { status: 400 });
    }
  }

  const volumeLines: VolumeSheetLine[] = lines.map((line) => ({
    boxNo: line.boxNo,
    productName: line.productName,
    bottlesPerBox: line.bottlesPerBox,
    batchNo: updates.has(line.boxNo) ? (updates.get(line.boxNo) ?? "") : (line.batchNo ?? ""),
  }));

  const hasBatchAssignment = volumeLines.some((l) => normalizeBatchNo(l.batchNo).length > 0);
  if (hasBatchAssignment) {
    const validation = validateAndComputeWeights(volumeLines, batchDefs, catalog);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.error,
          details: validation.details,
          missingProducts: validation.missingProducts,
        },
        { status: 400 },
      );
    }

    for (const line of lines) {
      if (updates.has(line.boxNo)) {
        line.batchNo = updates.get(line.boxNo) ?? "";
      }
      line.weight = validation.weights.get(line.boxNo) ?? null;
    }

    order.set("batchDefs", batchDefs);
  } else {
    for (const line of lines) {
      if (updates.has(line.boxNo)) {
        line.batchNo = "";
        line.weight = null;
      }
    }
    order.set("batchDefs", batchDefs);
  }

  order.sheetLines = lines;
  order.batchUpdatedByUserId = userId;
  order.batchUpdatedByName = session.user.name ?? "";
  order.batchUpdatedAt = new Date();
  await order.save();

  return NextResponse.json({ ok: true });
}
