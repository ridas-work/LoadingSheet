import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import {
  assertGateTransition,
  gateDeliveryUpdateFields,
  GATE_STATUS_LABELS,
  normalizeGateStatus,
  parseGateDeliveryPatchBody,
} from "@/lib/gateDelivery";
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
  deductReadyBottlesForDelivered,
  restoreReadyBottlesAfterReturn,
  type ReadyDeductionSummaryLine,
} from "@/lib/readyBottleDispatch";
import { getReadyStockMap } from "@/lib/readyBottleLedger";
import { readyAllocationForOrder } from "@/lib/orderBatchStatus";
import type { DeductionPacking } from "@/lib/packagingDeduction";
import { canEditGateDelivery, roleFromSession } from "@/lib/roles";

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
  const existing = await Order.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const from = normalizeGateStatus(existing.gateDeliveryStatus);
  const transitionError = assertGateTransition(from, parsed.status);
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const $set = gateDeliveryUpdateFields(parsed.status, { userId, userName });
  const audit = { userId, userName };
  const sheetLines = (existing.sheetLines ?? []) as DeductionSheetLine[];

  if (parsed.status === "pending_redelivery" && from === "delivered" && existing.readyBottleDeductedAt) {
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

  if (parsed.status === "delivered") {
    const [catalogDocs, packagingItems] = await Promise.all([
      ProductPacking.find({ active: true })
        .select({ code: 1, name: 1, bottlesPerCarton: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
        .lean(),
      PackagingItem.find({ active: true }).lean(),
    ]);
    const catalog = packingCatalogFromDocs(catalogDocs);
    const catalogDeduction: DeductionPacking[] = catalog.map((p) => ({
      code: p.code,
      name: p.name,
      bottlesPerCarton: p.bottlesPerCarton,
      aliases: p.aliases,
      batchFamily: p.batchFamily,
      bundleComponents: p.bundleComponents,
    }));
    const readyStockMap = await getReadyStockMap();
    const readyByBox = readyAllocationForOrder(
      sheetLines.map((l, i) => ({
        boxNo: l.boxNo ?? i + 1,
        productName: l.productName,
        bottlesPerBox: l.bottlesPerBox,
        lineKind: l.lineKind,
        mixedContents: l.mixedContents,
      })),
      catalogDeduction,
      readyStockMap,
    );

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

    if (!existing.packagingDeductedAt) {
      const preview = buildPackagingDeductionPreview({
        sheetLines,
        catalog: catalogDeduction,
        packagingItems,
        readyByBox,
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
          note: `PO ${existing.poNumber} delivered`,
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
  });
}
