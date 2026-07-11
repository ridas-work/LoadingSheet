import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import {
  CombinedTripLoadingSheet,
  type CombinedTripLine,
  type CombinedTripOrder,
} from "@/components/CombinedTripLoadingSheet";
import { TripBatchAssignmentSheet } from "@/components/TripBatchAssignmentSheet";
import { auth } from "@/lib/auth";
import { buildSheetLines, type OrderItemInput, type SheetLine } from "@/lib/buildSheetLines";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { accumulateBatchUsageFromSheetLines } from "@/lib/bundleCatalog";
import { connectToDatabase } from "@/lib/db";
import { formatDisplayDate } from "@/lib/dateOnly";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { regularProductionBatchMongoFilter } from "@/lib/sampleProductionStock";
import { listBatchLots } from "@/lib/readyBottleLedger";
import { canAssignDispatchBatches, homePathForRole, roleFromSession } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dispatch?: string }>;
};

function normalizeSheetLines(order: {
  sheetLines?: SheetLine[];
  items?: Array<{
    productName?: string;
    boxes?: number;
    bottles?: number;
    bottlesPerBox?: number;
  }>;
}): CombinedTripLine[] {
  let sheetLines = (order.sheetLines ?? []) as SheetLine[];
  if (sheetLines.length === 0 && Array.isArray(order.items)) {
    const rebuilt: OrderItemInput[] = [];
    for (const it of order.items) {
      const productName = it.productName?.trim();
      if (!productName) continue;
      const boxes =
        typeof it.boxes === "number" && it.boxes >= 1
          ? it.boxes
          : typeof it.bottles === "number" && it.bottles >= 1
            ? it.bottles
            : 0;
      const bottlesPerBox =
        typeof it.bottlesPerBox === "number" && it.bottlesPerBox >= 1 ? it.bottlesPerBox : 10;
      if (boxes >= 1) rebuilt.push({ productName, boxes, bottlesPerBox });
    }
    if (rebuilt.length > 0) sheetLines = buildSheetLines(rebuilt);
  }

  return sheetLines.map((row) => {
    const extended = row as SheetLine & {
      lineKind?: string;
      mixedContents?: Array<{ productName: string; bottles: number }>;
      componentBatches?: Array<{ productName: string; batchNo?: string | null }>;
      cartonWeightKg?: number | null;
    };
    return {
      boxNo: row.boxNo,
      productName: row.productName,
      bottlesPerBox: row.bottlesPerBox,
      lineKind: extended.lineKind,
      mixedContents: extended.mixedContents,
      batchNo: row.batchNo ?? "",
      componentBatches: extended.componentBatches?.map((component) => ({
        productName: component.productName,
        batchNo: component.batchNo ?? "",
      })),
      cartonWeightKg: extended.cartonWeightKg ?? null,
    };
  });
}

function formatDate(value: unknown): string {
  if (!value) return "";
  return formatDisplayDate(value as string | Date);
}

export default async function CombinedTripLoadingSheetPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { dispatch: dispatchParam } = await searchParams;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (role && role !== "dispatch_editor" && role !== "admin") {
    redirect(homePathForRole(role, username));
  }
  const canAssignBatches = canAssignDispatchBatches(role, username);
  const editMode = dispatchParam === "1" && canAssignBatches;

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id).lean();
  if (!trip) notFound();

  const orderIds = (trip.orderIds ?? []).map((orderId) => orderId.toString());
  const tripOrderIdSet = new Set(orderIds);
  const [orderDocs, allOrderDocs, catalogDocs, productionBatchDocs, readyBatchLots] = await Promise.all([
    orderIds.length > 0
      ? Order.find({ _id: { $in: orderIds } })
          .select({
            poNumber: 1,
            customerName: 1,
            items: 1,
            sheetLines: 1,
            "dispatch.dcNo": 1,
          })
          .lean()
      : [],
    Order.find({}).select({ sheetLines: 1 }).lean(),
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
      .lean(),
    ProductionBatch.find(regularProductionBatchMongoFilter()).sort({ preparedAt: -1 }).lean(),
    listBatchLots(),
  ]);

  const orderById = new Map(orderDocs.map((order) => [order._id.toString(), order]));
  const tripChallanByOrderId = new Map(
    ((trip as { orderChallans?: Array<{ orderId: { toString(): string }; dcNo?: string }> }).orderChallans ??
      []).map((row) => [row.orderId.toString(), row.dcNo?.trim() ?? ""]),
  );

  const orders: CombinedTripOrder[] = orderIds
    .map((orderId) => {
      const order = orderById.get(orderId);
      if (!order) return null;
      const dispatchDc = (order as { dispatch?: { dcNo?: string } }).dispatch?.dcNo?.trim() ?? "";
      return {
        id: orderId,
        poNumber: order.poNumber,
        customerName: order.customerName,
        challanNo: tripChallanByOrderId.get(orderId) || dispatchDc || trip.dcNo || "",
        lines: normalizeSheetLines(order as Parameters<typeof normalizeSheetLines>[0]),
      };
    })
    .filter((order): order is CombinedTripOrder => Boolean(order));

  const catalog = packingCatalogFromDocs(catalogDocs);
  const usedLitersElsewhere: Record<string, number> = {};
  const ordersOutsideTrip = allOrderDocs.filter(
    (order) => !tripOrderIdSet.has(order._id.toString()),
  );
  for (const [key, liters] of accumulateBatchUsageFromSheetLines(ordersOutsideTrip, catalog)) {
    usedLitersElsewhere[key] = liters;
  }

  if (editMode) {
    return (
      <TripBatchAssignmentSheet
        tripId={id}
        vehicleNo={trip.vehicleNo ?? ""}
        driverName={trip.driverName ?? ""}
        tripDate={formatDate(trip.dispatchedAt ?? trip.createdAt)}
        orders={orders}
        catalog={catalog}
        productionBatches={productionBatchDocs.map((batch) => ({
          batchNo: batch.batchNo,
          productName: batch.productName,
          totalLiters: batch.totalLiters,
        }))}
        readyBatchLots={readyBatchLots.map((lot) => ({
          batchNo: lot.batchNo,
          productCode: lot.productCode,
          productName: lot.productName,
          bottles: lot.bottles,
          batchProductName: lot.batchProductName,
        }))}
        usedLitersElsewhere={usedLitersElsewhere}
      />
    );
  }

  return (
    <CombinedTripLoadingSheet
      tripId={id}
      vehicleNo={trip.vehicleNo ?? ""}
      driverName={trip.driverName ?? ""}
      helperName={trip.helperName ?? ""}
      productionIncharge={trip.productionIncharge ?? ""}
      securityName={trip.securityName ?? ""}
      driverSignature={trip.driverSignature ?? ""}
      tripDate={formatDate(trip.dispatchedAt ?? trip.createdAt)}
      orders={orders}
    />
  );
}
