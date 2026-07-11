import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import type { PackingCatalogRow } from "@/lib/bundleCatalog";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import {
  assertGateTransition,
  gateDeliveryUpdateFields,
  GATE_STATUS_LABELS,
  normalizeGateStatus,
  parseGateDeliveryPatchBody,
} from "@/lib/gateDelivery";
import {
  buildClosureLinesFromOrder,
  catalogProductOptions,
  closureProductOptions,
  normalizeClosureForDisplay,
  parseDeliveryClosureBody,
  parseLateReturnBody,
} from "@/lib/gateDeliveryClosure";
import { Order } from "@/lib/models/Order";
import { applyPackagingUipIncrements } from "@/lib/packagingStockApply";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { ProductPacking } from "@/lib/models/ProductPacking";
import {
  assertPackagingDeductionPreview,
  buildPackagingDeductionPreview,
  type DeductionSheetLine,
} from "@/lib/packagingDeduction";
import {
  applyDeliveryClosureStock,
  applyLateReturnStock,
  deductReadyBottlesForDelivered,
  restoreReadyBottlesAfterReturn,
  type ReadyDeductionSummaryLine,
} from "@/lib/readyBottleDispatch";
import { restoreSampleProductionForReturn } from "@/lib/sampleProductionStock";
import { canEditGateDelivery, roleFromSession } from "@/lib/roles";

/** productName → assigned batchNo from the order's sheet lines (for sample pool credit). */
function sampleBatchByProduct(
  sheetLines: Array<{ productName?: string; batchNo?: string | null }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of sheetLines) {
    const name = (line.productName ?? "").trim();
    const batchNo = (line.batchNo ?? "").trim();
    if (name && batchNo && !map.has(name)) map.set(name, batchNo);
  }
  return map;
}

async function loadCatalog(): Promise<PackingCatalogRow[]> {
  const catalogDocs = await ProductPacking.find({ active: true })
    .select({
      code: 1,
      name: 1,
      bottlesPerCarton: 1,
      litersPerBottle: 1,
      aliases: 1,
      batchFamily: 1,
      bundleComponents: 1,
    })
    .lean();
  return packingCatalogFromDocs(catalogDocs);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditGateDelivery(role) && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  await connectToDatabase();
  const order = await Order.findById(id).lean();
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const catalog = await loadCatalog();
  const status = normalizeGateStatus(order.gateDeliveryStatus);
  const dispatchedLines = buildClosureLinesFromOrder(
    (order.sheetLines ?? []) as DeductionSheetLine[],
    catalog,
  );
  const closure = normalizeClosureForDisplay(
    {
      deliveryOutcome: order.deliveryOutcome,
      orderClosedAt: order.orderClosedAt,
      orderClosedByName: order.orderClosedByName,
      deliveryClosureLines: (order.deliveryClosureLines ?? []).map((l) => ({
        productCode: l.productCode,
        productName: l.productName,
        dispatchedBottles: l.dispatchedBottles,
        deliveredBottles: l.deliveredBottles,
        damagedBottles: l.damagedBottles,
        returnedBottles: l.returnedBottles,
      })),
      deliveryLateReturns: (order.deliveryLateReturns ?? []).map((r) => ({
        note: r.note ?? "",
        recordedAt: r.recordedAt,
        recordedByName: r.recordedByName,
        lines: (r.lines ?? []).map((l) => ({
          productCode: l.productCode,
          productName: l.productName,
          damagedBottles: l.damagedBottles,
          returnedBottles: l.returnedBottles,
        })),
      })),
      sheetLines: order.sheetLines as DeductionSheetLine[],
    },
    catalog,
  );

  return NextResponse.json({
    id: order._id.toString(),
    poNumber: order.poNumber,
    customerName: order.customerName,
    gateDeliveryStatus: status,
    dispatchedLines,
    closure,
    catalogProducts: catalogProductOptions(catalog),
    lateReturnProducts: closureProductOptions(
      {
        deliveryClosureLines: order.deliveryClosureLines,
        sheetLines: order.sheetLines as DeductionSheetLine[],
      },
      catalog,
      { includeFullCatalog: true },
    ),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditGateDelivery(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  const userName = session.user.name ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = parseGateDeliveryPatchBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await Order.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const audit = { userId, userName };
  const catalog = await loadCatalog();
  const sheetLines = (existing.sheetLines ?? []) as DeductionSheetLine[];
  // Field samples skip Rashid ready-stock movements (drawn from Esha's sample pool),
  // but packaging still deducts the full mapped BOM when Zaman marks them delivered.
  const isSample = existing.orderKind === "field_sample";

  if (parsed.lateReturn) {
    if (normalizeGateStatus(existing.gateDeliveryStatus) !== "delivered") {
      return NextResponse.json(
        { error: "Late returns can only be recorded on delivered (closed) orders." },
        { status: 400 },
      );
    }

    const products = catalogProductOptions(catalog);
    const lateParsed = parseLateReturnBody(body, products);
    if (!lateParsed.ok) {
      return NextResponse.json({ errors: lateParsed.errors }, { status: 400 });
    }

    if (isSample) {
      // Returned sample bottles go back into Esha's sample production pool.
      if (existing.fieldVisitTicketId) {
        const batchByProduct = sampleBatchByProduct(existing.sheetLines ?? []);
        await restoreSampleProductionForReturn({
          visitTicketId: existing.fieldVisitTicketId.toString(),
          returns: lateParsed.payload.lines.map((l) => ({
            productName: l.productName,
            bottles: l.returnedBottles,
            batchNo: batchByProduct.get(l.productName.trim()),
          })),
          catalog,
          actor: { userName, username: "" },
        });
      }
    } else {
      const stockErr = await applyLateReturnStock({
        orderId: id,
        poNumber: existing.poNumber,
        lines: lateParsed.payload.lines,
        note: lateParsed.payload.note,
        audit,
      });
      if (stockErr) {
        return NextResponse.json({ error: stockErr }, { status: 400 });
      }
    }

    const now = new Date();
    if (!existing.deliveryLateReturns) {
      existing.set("deliveryLateReturns", []);
    }
    existing.deliveryLateReturns!.push({
      note: lateParsed.payload.note,
      recordedAt: now,
      recordedByUserId: userId,
      recordedByName: userName,
      lines: lateParsed.payload.lines,
    });
    await existing.save();

    const closure = normalizeClosureForDisplay(existing, catalog);
    const returned = lateParsed.payload.lines.reduce((s, l) => s + l.returnedBottles, 0);
    const damaged = lateParsed.payload.lines.reduce((s, l) => s + l.damagedBottles, 0);

    return NextResponse.json({
      ok: true,
      lateReturnRecorded: true,
      returnedBottles: returned,
      damagedBottles: damaged,
      deliveryClosure: closure,
    });
  }

  const from = normalizeGateStatus(existing.gateDeliveryStatus);
  const transitionError = assertGateTransition(from, parsed.status);
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const $set = gateDeliveryUpdateFields(parsed.status, audit);

  if (!isSample && parsed.status === "pending_redelivery" && from === "delivered" && existing.readyBottleDeductedAt) {
    const summary = (existing.readyBottleDeductionSummary ?? []) as ReadyDeductionSummaryLine[];
    const restoreError = await restoreReadyBottlesAfterReturn({
      orderId: id,
      poNumber: existing.poNumber,
      summary,
      audit,
    });
    if (restoreError) {
      return NextResponse.json({ error: restoreError }, { status: 400 });
    }
    $set.readyBottleRestoredAt = new Date();
  }

  let closurePayload = null;

  if (parsed.status === "delivered") {
    const dispatchedLines = buildClosureLinesFromOrder(sheetLines, catalog);
    const closureRaw = (body as { closure?: unknown })?.closure;
    const closureParsed = parseDeliveryClosureBody(closureRaw, dispatchedLines, catalog);
    if (!closureParsed.ok) {
      return NextResponse.json({ errors: closureParsed.errors }, { status: 400 });
    }
    closurePayload = closureParsed.payload;

    if (!isSample) {
      if (!existing.readyBottleDeductedAt) {
        const readyResult = await deductReadyBottlesForDelivered({
          orderId: id,
          poNumber: existing.poNumber,
          sheetLines,
          catalog,
          audit,
        });
        if (readyResult.error) {
          return NextResponse.json({ error: readyResult.error }, { status: 400 });
        }
        $set.readyBottleDeductedAt = new Date();
        $set.readyBottleDeductedByUserId = userId;
        $set.readyBottleDeductedByName = userName;
        $set.readyBottleDeductionSummary = readyResult.summary;
        $set.readyBottleRestoredAt = null;
      }

      const deductionSummary = ($set.readyBottleDeductionSummary ??
        existing.readyBottleDeductionSummary ??
        []) as ReadyDeductionSummaryLine[];

      const closureStockErr = await applyDeliveryClosureStock({
        orderId: id,
        poNumber: existing.poNumber,
        outcome: closurePayload.outcome,
        closureLines: closurePayload.lines,
        deductionSummary,
        audit,
      });
      if (closureStockErr) {
        return NextResponse.json({ error: closureStockErr }, { status: 400 });
      }
    }

    // Regular POs and sample orders: always deduct the full mapped BOM recipe
    // (even when Rashid shipped entirely from ready stock).
    if (!existing.packagingDeductedAt) {
      const packagingItems = await PackagingItem.find({ active: true }).lean();
      const preview = buildPackagingDeductionPreview({
        sheetLines,
        catalog,
        packagingItems,
      });
      const previewError = assertPackagingDeductionPreview(preview);
      if (previewError) {
        return NextResponse.json({ error: previewError }, { status: 400 });
      }

      const applyError = await applyPackagingUipIncrements(
        preview.lines.map((line) => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          detail: line.reasonDetail,
        })),
        {
          reason: "delivered",
          note: `${isSample ? "Sample" : "PO"} ${existing.poNumber} delivered`,
          recordedByUserId: userId,
          recordedByName: userName,
        },
      );
      if (applyError) {
        return NextResponse.json({ error: applyError }, { status: 400 });
      }

      $set.packagingDeductedAt = new Date();
      $set.packagingDeductedByUserId = userId;
      $set.packagingDeductedByName = userName;
      $set.packagingDeductionSummary = preview.lines.map((line) => ({
        itemCode: line.itemCode,
        itemName: line.itemName,
        quantity: line.quantity,
      }));
    }

    if (isSample && closurePayload.outcome === "partial" && existing.fieldVisitTicketId) {
      // Good returned sample bottles go back into Esha's sample production pool.
      const batchByProduct = sampleBatchByProduct(existing.sheetLines ?? []);
      await restoreSampleProductionForReturn({
        visitTicketId: existing.fieldVisitTicketId.toString(),
        returns: closurePayload.lines
          .filter((l) => l.returnedBottles > 0)
          .map((l) => ({
            productName: l.productName,
            bottles: l.returnedBottles,
            batchNo: batchByProduct.get(l.productName.trim()),
          })),
        catalog,
        actor: { userName, username: "" },
      });
    }

    const now = new Date();
    $set.deliveryOutcome = closurePayload.outcome;
    $set.deliveryClosureLines = closurePayload.lines;
    $set.orderClosedAt = now;
    $set.orderClosedByUserId = userId;
    $set.orderClosedByName = userName;
  }

  const doc = await Order.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = normalizeGateStatus(doc.gateDeliveryStatus);
  const deductionSummary = (doc.packagingDeductionSummary ?? []) as Array<{
    itemCode?: string;
    itemName?: string;
    quantity?: number;
  }>;

  const deliveryClosure =
    parsed.status === "delivered" && closurePayload
      ? normalizeClosureForDisplay(doc, catalog)
      : undefined;

  return NextResponse.json({
    order: {
      id: doc._id.toString(),
      gateDeliveryStatus: status,
      gateStatusLabel: GATE_STATUS_LABELS[status],
      gateOutAt: doc.gateOutAt ?? null,
      gateDeliveredAt: doc.gateDeliveredAt ?? null,
      gatePendingAt: doc.gatePendingAt ?? null,
      gateUpdatedAt: doc.gateUpdatedAt ?? null,
      gateUpdatedByName: doc.gateUpdatedByName ?? "",
    },
    packagingStockUpdated: parsed.status === "delivered" && Boolean(doc.packagingDeductedAt),
    packagingDeductionSummary: deductionSummary,
    readyBottleStockUpdated: parsed.status === "delivered" && Boolean(doc.readyBottleDeductedAt),
    readyBottleDeductionSummary: doc.readyBottleDeductionSummary ?? [],
    deliveryClosure,
  });
}
