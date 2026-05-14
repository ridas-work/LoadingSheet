import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import {
  accumulateBatchUsageFromSheetLines,
  isBundleProduct,
  lineBatchAllocations,
  type ComponentBatch,
  type PackingCatalogRow,
  validateSheetBatchAllocations,
} from "@/lib/bundleCatalog";
import { effectiveBatchDefsForOrder, normalizeBatchNo, poolToBatchDefs, productsMatch } from "@/lib/batchVolume";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { isBatchAssignmentLocked } from "@/lib/orderBatchStatus";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { roleFromSession } from "@/lib/roles";

type AssignmentInput = {
  boxNo?: unknown;
  batchNo?: unknown;
  componentBatches?: unknown;
};

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

  const assignmentMap = new Map<
    number,
    { batchNo: string; componentBatches: ComponentBatch[] }
  >();

  for (const raw of body.assignments as AssignmentInput[]) {
    const boxNo = typeof raw.boxNo === "number" ? raw.boxNo : Number(raw.boxNo);
    if (!Number.isInteger(boxNo) || boxNo < 1) continue;

    const componentBatches = Array.isArray(raw.componentBatches)
      ? (raw.componentBatches as Array<{ productName?: unknown; batchNo?: unknown }>)
          .map((c) => ({
            productName: typeof c.productName === "string" ? c.productName.trim() : "",
            batchNo: typeof c.batchNo === "string" ? normalizeBatchNo(c.batchNo) : "",
          }))
          .filter((c) => c.productName)
      : [];

    assignmentMap.set(boxNo, {
      batchNo: typeof raw.batchNo === "string" ? normalizeBatchNo(raw.batchNo) : "",
      componentBatches,
    });
  }

  await connectToDatabase();

  const [order, allOrders, poolDocs, catalogDocs] = await Promise.all([
    Order.findById(id),
    Order.find({}).select({ sheetLines: 1 }).lean(),
    ProductionBatch.find({}).lean(),
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
      .lean(),
  ]);

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const catalog: PackingCatalogRow[] = packingCatalogFromDocs(catalogDocs);

  if (isBatchAssignmentLocked(order.sheetLines, catalog)) {
    return NextResponse.json(
      { error: "Batch assignments are locked — all rows already have batches assigned." },
      { status: 403 },
    );
  }

  const pool = poolDocs.map((p) => ({
    batchNo: p.batchNo,
    productName: p.productName,
    totalLiters: p.totalLiters,
  }));

  const poolByKey = new Map(pool.map((p) => [normalizeBatchNo(p.batchNo).toLowerCase(), p]));

  const workingLines = (order.sheetLines ?? []).map((line) => {
    const incoming = assignmentMap.get(line.boxNo);
    const bundle = isBundleProduct(line.productName, catalog);

    if (bundle) {
      const componentBatches =
        incoming?.componentBatches ??
        (line.componentBatches ?? []).map((c) => ({
          productName: c.productName,
          batchNo: c.batchNo ?? "",
        }));
      return {
        boxNo: line.boxNo,
        productName: line.productName,
        bottlesPerBox: line.bottlesPerBox,
        batchNo: "",
        componentBatches,
      };
    }

    const batchNo = incoming ? incoming.batchNo : (line.batchNo ?? "");
    return {
      boxNo: line.boxNo,
      productName: line.productName,
      bottlesPerBox: line.bottlesPerBox,
      batchNo,
      componentBatches: [],
    };
  });

  for (const line of workingLines) {
    for (const alloc of lineBatchAllocations(line, catalog)) {
      const batch = poolByKey.get(alloc.batchNo.toLowerCase());
      if (!batch) {
        return NextResponse.json({ error: `Unknown batch "${alloc.batchNo}".` }, { status: 400 });
      }
      if (!productsMatch(batch.productName, alloc.productName, catalog)) {
        return NextResponse.json(
          {
            error: `Batch "${alloc.batchNo}" is for ${batch.productName}, not ${alloc.productName} (box ${line.boxNo}).`,
          },
          { status: 400 },
        );
      }
    }
  }

  const usedElsewhere = accumulateBatchUsageFromSheetLines(allOrders, catalog, id);
  const effectiveDefs = effectiveBatchDefsForOrder(poolToBatchDefs(pool), usedElsewhere);

  const validation = validateSheetBatchAllocations(workingLines, effectiveDefs, catalog);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  for (const line of order.sheetLines ?? []) {
    const working = workingLines.find((w) => w.boxNo === line.boxNo);
    if (!working) continue;

    if (isBundleProduct(line.productName, catalog)) {
      line.set("batchNo", "");
      line.set(
        "componentBatches",
        (working.componentBatches ?? []).map((c) => ({
          productName: c.productName,
          batchNo: c.batchNo,
        })),
      );
    } else {
      line.set("batchNo", working.batchNo);
      line.set("componentBatches", []);
    }
    line.weight = validation.weights.get(line.boxNo) ?? null;
  }

  order.batchUpdatedByUserId = userId;
  order.batchUpdatedByName = session.user.name ?? "";
  order.batchUpdatedAt = new Date();
  await order.save();

  return NextResponse.json({ ok: true });
}
