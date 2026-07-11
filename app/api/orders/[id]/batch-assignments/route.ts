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
import { enrichWeightsWithReadyShelf, validateReadyBatchRequirements } from "@/lib/readyStockAllocation";
import { augmentPoolWithReadyBatches } from "@/lib/readyBatchPool";
import { isMixedSampleLine } from "@/lib/mixedSampleBox";
import { effectiveBatchDefsForOrder, findPoolBatch, normalizeBatchNo, poolToBatchDefs } from "@/lib/batchVolume";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { isBatchAssignmentLocked, readyAllocationForOrder } from "@/lib/orderBatchStatus";
import { getReadyStockMap, listBatchLots } from "@/lib/readyBottleLedger";
import type { DeductionPacking } from "@/lib/packagingDeduction";
import { regularProductionBatchMongoFilter } from "@/lib/sampleProductionStock";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { roleFromSession } from "@/lib/roles";
import {
  allStandardCartonWeightsValid,
  validateAllSheetCartonWeights,
} from "@/lib/standardCartonWeight";

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

  const body = (await req.json().catch(() => null)) as {
    assignments?: unknown;
    cartonWeights?: unknown;
  } | null;
  if (!body || !Array.isArray(body.assignments)) {
    return NextResponse.json({ error: "assignments array is required" }, { status: 400 });
  }

  const weightByBox = new Map<number, number>();
  if (Array.isArray(body.cartonWeights)) {
    for (const raw of body.cartonWeights as Array<{ boxNo?: unknown; cartonWeightKg?: unknown }>) {
      const boxNo = typeof raw.boxNo === "number" ? raw.boxNo : Number(raw.boxNo);
      const kg =
        typeof raw.cartonWeightKg === "number" ? raw.cartonWeightKg : Number(raw.cartonWeightKg);
      if (Number.isInteger(boxNo) && boxNo >= 1 && Number.isFinite(kg) && kg > 0) {
        weightByBox.set(boxNo, kg);
      }
    }
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
    ProductionBatch.find(regularProductionBatchMongoFilter()).lean(),
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
      .lean(),
  ]);

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.orderKind === "field_sample") {
    return NextResponse.json(
      { error: "Field sample orders use the sample batch assignment route." },
      { status: 400 },
    );
  }

  const catalog: PackingCatalogRow[] = packingCatalogFromDocs(catalogDocs);
  const catalogDeduction: DeductionPacking[] = catalog.map((p) => ({
    code: p.code,
    name: p.name,
    bottlesPerCarton: p.bottlesPerCarton,
    aliases: p.aliases,
    batchFamily: p.batchFamily,
    bundleComponents: p.bundleComponents,
  }));
  const [readyStockMap, readyBatchLots] = await Promise.all([getReadyStockMap(), listBatchLots()]);
  const readyByBox = readyAllocationForOrder(
    order.sheetLines,
    catalogDeduction,
    readyStockMap,
    readyBatchLots.map((l) => ({
      batchNo: l.batchNo,
      productCode: l.productCode,
      bottles: l.bottles,
      createdAt: l.createdAt,
    })),
  );

  const batchesLocked = isBatchAssignmentLocked(order.sheetLines, catalog, readyByBox);
  const weightOnlyUpdate = batchesLocked && weightByBox.size > 0;
  if (batchesLocked && weightByBox.size === 0) {
    return NextResponse.json(
      { error: "Batch assignments are locked — use carton weight fields to update weights." },
      { status: 403 },
    );
  }
  if (batchesLocked && Boolean(order.weightsVerifiedAt) && weightByBox.size > 0) {
    return NextResponse.json(
      { error: "Carton weights are already verified for this PO." },
      { status: 403 },
    );
  }

  const pool = augmentPoolWithReadyBatches(
    poolDocs.map((p) => ({
      batchNo: p.batchNo,
      productName: p.productName,
      totalLiters: p.totalLiters,
    })),
    readyBatchLots.map((l) => ({
      batchNo: l.batchNo,
      productCode: l.productCode,
      productName: l.productName,
      bottles: l.bottles,
      batchProductName: l.batchProductName,
    })),
    catalog,
  );

  const workingLines = (order.sheetLines ?? []).map((line) => {
    const incoming = assignmentMap.get(line.boxNo);
    const bundle = isBundleProduct(line.productName, catalog);
    const mixed = isMixedSampleLine(line);

    if (bundle || mixed) {
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
        lineKind: line.lineKind,
        mixedContents: mixed
          ? (line.mixedContents ?? []).map((c) => ({
              productName: c.productName,
              bottles: c.bottles,
            }))
          : [],
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
      const batch = findPoolBatch(pool, alloc.batchNo, alloc.productName, catalog);
      if (!batch) {
        return NextResponse.json({ error: `Unknown batch "${alloc.batchNo}".` }, { status: 400 });
      }
    }
  }

  const usedElsewhere = accumulateBatchUsageFromSheetLines(allOrders, catalog, id);
  const effectiveDefs = effectiveBatchDefsForOrder(poolToBatchDefs(pool), usedElsewhere, catalog);

  let validationWeights: Map<number, number | null>;
  if (weightOnlyUpdate) {
    validationWeights = new Map(
      (order.sheetLines ?? []).map((line) => [line.boxNo, line.weight ?? null] as const),
    );
  } else {
    const validation = validateSheetBatchAllocations(workingLines, effectiveDefs, catalog);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const readyValidation = validateReadyBatchRequirements(workingLines, catalog, readyByBox);
    if (!readyValidation.ok) {
      return NextResponse.json({ error: readyValidation.error }, { status: 400 });
    }
    validationWeights = validation.weights;
  }

  const mergedWeightByBox = new Map<number, number>();
  for (const line of order.sheetLines ?? []) {
    const fromInput = weightByBox.get(line.boxNo);
    const existing =
      typeof line.cartonWeightKg === "number" && line.cartonWeightKg > 0
        ? line.cartonWeightKg
        : null;
    const kg = fromInput ?? existing;
    if (kg != null && kg > 0) mergedWeightByBox.set(line.boxNo, kg);
  }

  const sheetLinesForWeight = (order.sheetLines ?? []).map((line) => ({
    boxNo: line.boxNo,
    productName: line.productName,
    bottlesPerBox: line.bottlesPerBox,
  }));

  const weightValidation = validateAllSheetCartonWeights(
    sheetLinesForWeight,
    mergedWeightByBox,
    catalog,
  );
  if (!weightValidation.ok) {
    return NextResponse.json({ errors: weightValidation.errors }, { status: 400 });
  }

  const finalWeights = weightOnlyUpdate
    ? validationWeights
    : enrichWeightsWithReadyShelf(workingLines, catalog, validationWeights, readyByBox);

  for (const line of order.sheetLines ?? []) {
    const working = workingLines.find((w) => w.boxNo === line.boxNo);
    if (!working) continue;

    if (!weightOnlyUpdate) {
      if (isBundleProduct(line.productName, catalog) || isMixedSampleLine(line)) {
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
      line.weight = finalWeights.get(line.boxNo) ?? null;
    }
    const kg = mergedWeightByBox.get(line.boxNo);
    line.cartonWeightKg = kg != null ? kg : null;
  }

  const linesWithKg = sheetLinesForWeight.map((l) => ({
    ...l,
    cartonWeightKg: mergedWeightByBox.get(l.boxNo) ?? null,
  }));
  order.weightsVerifiedAt = allStandardCartonWeightsValid(linesWithKg, catalog)
    ? new Date()
    : null;

  order.batchUpdatedByUserId = userId;
  order.batchUpdatedByName = session.user.name ?? "";
  order.batchUpdatedAt = new Date();
  order.markModified("sheetLines");
  await order.save();

  return NextResponse.json({ ok: true });
}
