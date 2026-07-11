import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import {
  accumulateBatchUsageFromSheetLines,
  isBundleProduct,
  lineBatchAllocations,
  lineBatchComplete,
  lineTotalLiters,
  type ComponentBatch,
  type PackingCatalogRow,
  validateSheetBatchAllocations,
} from "@/lib/bundleCatalog";
import { effectiveBatchDefsForOrder, findPoolBatch, normalizeBatchNo, poolToBatchDefs } from "@/lib/batchVolume";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { isRashidActiveGateStatus } from "@/lib/gateDelivery";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { listBatchLots } from "@/lib/readyBottleLedger";
import { augmentPoolWithReadyBatches } from "@/lib/readyBatchPool";
import { regularProductionBatchMongoFilter } from "@/lib/sampleProductionStock";
import { canAssignDispatchBatches, roleFromSession } from "@/lib/roles";
import { isMixedSampleLine } from "@/lib/mixedSampleBox";
import {
  allStandardCartonWeightsValid,
  validateSheetLineCartonWeight,
} from "@/lib/standardCartonWeight";

type RouteCtx = { params: Promise<{ id: string }> };

type AssignmentInput = {
  orderId?: unknown;
  boxNo?: unknown;
  batchNo?: unknown;
  componentBatches?: unknown;
};

type CartonWeightInput = {
  orderId?: unknown;
  boxNo?: unknown;
  cartonWeightKg?: unknown;
};

function inputOrderId(value: unknown): string {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value) ? value : "";
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { role?: string; username?: string; id?: string; name?: string | null };
  const role = roleFromSession(user);
  if (!canAssignDispatchBatches(role, user.username)) {
    return NextResponse.json({ error: "Only Rashid can assign trip batches." }, { status: 403 });
  }

  const userId = user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    assignments?: unknown;
    cartonWeights?: unknown;
  } | null;
  if (!body || !Array.isArray(body.assignments)) {
    return NextResponse.json({ error: "assignments array is required" }, { status: 400 });
  }

  const assignmentMap = new Map<
    string,
    Map<number, { batchNo: string; componentBatches: ComponentBatch[] }>
  >();
  for (const raw of body.assignments as AssignmentInput[]) {
    const orderId = inputOrderId(raw.orderId);
    const boxNo = typeof raw.boxNo === "number" ? raw.boxNo : Number(raw.boxNo);
    if (!orderId || !Number.isInteger(boxNo) || boxNo < 1) continue;

    const componentBatches = Array.isArray(raw.componentBatches)
      ? (raw.componentBatches as Array<{ productName?: unknown; batchNo?: unknown }>)
          .map((component) => ({
            productName: typeof component.productName === "string" ? component.productName.trim() : "",
            batchNo: typeof component.batchNo === "string" ? normalizeBatchNo(component.batchNo) : "",
          }))
          .filter((component) => component.productName)
      : [];

    const byBox = assignmentMap.get(orderId) ?? new Map();
    byBox.set(boxNo, {
      batchNo: typeof raw.batchNo === "string" ? normalizeBatchNo(raw.batchNo) : "",
      componentBatches,
    });
    assignmentMap.set(orderId, byBox);
  }

  const weightMap = new Map<string, Map<number, number>>();
  if (Array.isArray(body.cartonWeights)) {
    for (const raw of body.cartonWeights as CartonWeightInput[]) {
      const orderId = inputOrderId(raw.orderId);
      const boxNo = typeof raw.boxNo === "number" ? raw.boxNo : Number(raw.boxNo);
      const kg =
        typeof raw.cartonWeightKg === "number" ? raw.cartonWeightKg : Number(raw.cartonWeightKg);
      if (!orderId || !Number.isInteger(boxNo) || boxNo < 1 || !Number.isFinite(kg) || kg <= 0) {
        continue;
      }
      const byBox = weightMap.get(orderId) ?? new Map();
      byBox.set(boxNo, kg);
      weightMap.set(orderId, byBox);
    }
  }

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const tripOrderIds = (trip.orderIds ?? []).map((orderId) => orderId.toString());
  const [orders, allOrders, poolDocs, catalogDocs, readyBatchLots] = await Promise.all([
    Order.find({ _id: { $in: tripOrderIds } }),
    Order.find({}).select({ sheetLines: 1 }).lean(),
    ProductionBatch.find(regularProductionBatchMongoFilter()).lean(),
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
      .lean(),
    listBatchLots(),
  ]);

  const catalog: PackingCatalogRow[] = packingCatalogFromDocs(catalogDocs);
  const pool = augmentPoolWithReadyBatches(
    poolDocs.map((batch) => ({
      batchNo: batch.batchNo,
      productName: batch.productName,
      totalLiters: batch.totalLiters,
    })),
    readyBatchLots.map((lot) => ({
      batchNo: lot.batchNo,
      productCode: lot.productCode,
      productName: lot.productName,
      bottles: lot.bottles,
      batchProductName: lot.batchProductName,
    })),
    catalog,
  );
  const tripOrderIdSet = new Set(tripOrderIds);
  const usedElsewhere = accumulateBatchUsageFromSheetLines(
    allOrders.filter((order) => {
      const oid = (order as { _id?: { toString(): string } | string })._id;
      const orderId = typeof oid === "string" ? oid : oid?.toString();
      return !orderId || !tripOrderIdSet.has(orderId);
    }),
    catalog,
  );
  const effectiveDefs = effectiveBatchDefsForOrder(poolToBatchDefs(pool), usedElsewhere, catalog);

  const allWorkingLines: Array<{
    boxNo: number;
    productName: string;
    bottlesPerBox: number;
    lineKind?: string | null;
    mixedContents?: Array<{ productName: string; bottles: number }> | null;
    batchNo?: string | null;
    componentBatches?: ComponentBatch[] | null;
  }> = [];
  const workingByOrderId = new Map<string, typeof allWorkingLines>();

  for (const order of orders) {
    const orderId = order._id.toString();
    if (!isRashidActiveGateStatus(order.gateDeliveryStatus)) {
      return NextResponse.json(
        { error: `PO ${order.poNumber} is already out for delivery or delivered.` },
        { status: 400 },
      );
    }

    const byBox = assignmentMap.get(orderId);
    const workingLines = (order.sheetLines ?? []).map((line) => {
      const incoming = byBox?.get(line.boxNo);
      const bundle = isBundleProduct(line.productName, catalog);
      const mixed = isMixedSampleLine(line);
      if (bundle || mixed) {
        return {
          boxNo: line.boxNo,
          productName: line.productName,
          bottlesPerBox: line.bottlesPerBox,
          lineKind: line.lineKind,
          mixedContents: mixed ? line.mixedContents ?? [] : [],
          batchNo: "",
          componentBatches:
            incoming?.componentBatches ??
            (line.componentBatches ?? []).map((component) => ({
              productName: component.productName,
              batchNo: component.batchNo ?? "",
            })),
        };
      }

      return {
        boxNo: line.boxNo,
        productName: line.productName,
        bottlesPerBox: line.bottlesPerBox,
        lineKind: line.lineKind,
        batchNo: incoming ? incoming.batchNo : line.batchNo ?? "",
        componentBatches: [],
      };
    });
    allWorkingLines.push(...workingLines);
    workingByOrderId.set(orderId, workingLines);
  }

  for (const line of allWorkingLines) {
    for (const allocation of lineBatchAllocations(line, catalog)) {
      const batch = findPoolBatch(pool, allocation.batchNo, allocation.productName, catalog);
      if (!batch) {
        return NextResponse.json({ error: `Unknown batch "${allocation.batchNo}".` }, { status: 400 });
      }
    }
  }

  const validation = validateSheetBatchAllocations(allWorkingLines, effectiveDefs, catalog);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const now = new Date();
  let completeLines = 0;
  let totalLines = 0;

  for (const order of orders) {
    const orderId = order._id.toString();
    const workingLines = workingByOrderId.get(orderId) ?? [];
    const weightsByBox = weightMap.get(orderId) ?? new Map<number, number>();
    const workingByBox = new Map(workingLines.map((line) => [line.boxNo, line]));

    for (const line of order.sheetLines ?? []) {
      const working = workingByBox.get(line.boxNo);
      if (!working) continue;

      if (isBundleProduct(line.productName, catalog) || isMixedSampleLine(line)) {
        line.set("batchNo", "");
        line.set(
          "componentBatches",
          (working.componentBatches ?? []).map((component) => ({
            productName: component.productName,
            batchNo: component.batchNo ?? "",
          })),
        );
      } else {
        line.set("batchNo", working.batchNo ?? "");
        line.set("componentBatches", []);
      }
      line.weight = lineTotalLiters(working, catalog);

      const incomingKg = weightsByBox.get(line.boxNo);
      if (incomingKg != null) {
        const weightCheck = validateSheetLineCartonWeight(line, catalog, incomingKg);
        if (!weightCheck.ok) {
          return NextResponse.json(
            { errors: { [`${orderId}.${line.boxNo}`]: `PO ${order.poNumber}: ${weightCheck.error}` } },
            { status: 400 },
          );
        }
        line.cartonWeightKg = incomingKg;
      }

      totalLines += 1;
      if (lineBatchComplete(working, catalog)) completeLines += 1;
    }

    order.weightsVerifiedAt = allStandardCartonWeightsValid(order.sheetLines ?? [], catalog) ? now : null;
    order.batchUpdatedByUserId = userId;
    order.batchUpdatedByName = user.name ?? "";
    order.batchUpdatedAt = now;
    order.markModified("sheetLines");
    await order.save();
  }

  return NextResponse.json({
    ok: true,
    completeLines,
    totalLines,
    fullyAssigned: totalLines > 0 && completeLines === totalLines,
  });
}
