import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import { LoadingSheetBatchEditor, type LoadingSheetLine } from "@/components/LoadingSheetBatchEditor";
import { isCustomerNameBlocked } from "@/lib/customerAccountAccess";
import { auth } from "@/lib/auth";
import { accumulateBatchUsageFromSheetLines } from "@/lib/bundleCatalog";
import { buildSheetLines, type OrderItemInput, type SheetLine } from "@/lib/buildSheetLines";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { formatDisplayDate } from "@/lib/dateOnly";
import { Order } from "@/lib/models/Order";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { bottlesPerProductFromSheetLines } from "@/lib/bottlesFromSheetLines";
import { isBatchAssignmentLocked, readyAllocationForOrder } from "@/lib/orderBatchStatus";
import { getReadyStockMap, listBatchLots } from "@/lib/readyBottleLedger";
import type { DeductionPacking, DeductionSheetLine } from "@/lib/packagingDeduction";
import { canViewOrderAsPoCreator } from "@/lib/orderAccess";
import { regularProductionBatchMongoFilter } from "@/lib/sampleProductionStock";
import { roleFromSession, EMPTY_DISPATCH, type DispatchFields } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dispatch?: string; from?: string }>;
};

function normalizeSheetLines(order: {
  sheetLines?: SheetLine[];
  items?: Array<{
    productName?: string;
    boxes?: number;
    bottles?: number;
    bottlesPerBox?: number;
  }>;
}): LoadingSheetLine[] {
  let sheetLines = (order.sheetLines ?? []) as SheetLine[];
  if (sheetLines.length === 0 && Array.isArray(order.items)) {
    const rebuilt: OrderItemInput[] = [];
    for (const it of order.items) {
      const pn = it.productName?.trim();
      if (!pn) continue;
      const boxes =
        typeof it.boxes === "number" && it.boxes >= 1
          ? it.boxes
          : typeof it.bottles === "number" && it.bottles >= 1
            ? it.bottles
            : 0;
      const bpb =
        typeof it.bottlesPerBox === "number" && it.bottlesPerBox >= 1 ? it.bottlesPerBox : 10;
      if (boxes >= 1) rebuilt.push({ productName: pn, boxes, bottlesPerBox: bpb });
    }
    if (rebuilt.length > 0) sheetLines = buildSheetLines(rebuilt);
  }

  return sheetLines.map((row) => {
    const extended = row as SheetLine & {
      lineKind?: string;
      mixedContents?: Array<{ productName: string; bottles: number }>;
      componentBatches?: Array<{ productName: string; batchNo?: string }>;
    };
    return {
      boxNo: row.boxNo,
      productName: row.productName,
      bottlesPerBox: row.bottlesPerBox,
      lineKind: extended.lineKind,
      mixedContents: extended.mixedContents,
      batchNo: row.batchNo ?? "",
      componentBatches: extended.componentBatches?.map((c) => ({
        productName: c.productName,
        batchNo: c.batchNo ?? "",
      })),
      weight: row.weight ?? null,
      cartonWeightKg:
        (row as { cartonWeightKg?: number | null }).cartonWeightKg ?? null,
    };
  });
}

export default async function LoadingSheetPage(props: PageProps) {
  const { id } = await props.params;
  const { dispatch: dispatchParam, from: fromParam } = await props.searchParams;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const userId = (session?.user as { id?: string })?.id;
  const canEditDispatch = role === "dispatch_editor";

  await connectToDatabase();
  const [order, allOrders, poolDocs, catalogDocs] = await Promise.all([
    Order.findById(id).lean(),
    Order.find({}).select({ sheetLines: 1 }).lean(),
    ProductionBatch.find(regularProductionBatchMongoFilter()).sort({ preparedAt: -1 }).lean(),
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
      .lean(),
  ]);

  if (!order) notFound();

  if (await isCustomerNameBlocked(order.customerName)) notFound();

  if (role === "po_creator" && !canViewOrderAsPoCreator(role, userId, order)) {
    redirect("/orders");
  }

  const catalog = packingCatalogFromDocs(catalogDocs);
  const sheetLines = normalizeSheetLines(order as Parameters<typeof normalizeSheetLines>[0]);
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
    sheetLines,
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
  const weightsVerifiedEarly = Boolean(
    (order as { weightsVerifiedAt?: Date | null }).weightsVerifiedAt,
  );
  const initialDispatchEditMode =
    canEditDispatch &&
    dispatchParam === "1" &&
    (!batchesLocked || !weightsVerifiedEarly);

  const productionBatches = poolDocs.map((p) => ({
    batchNo: p.batchNo,
    productName: p.productName,
    totalLiters: p.totalLiters,
  }));

  const usedMap = accumulateBatchUsageFromSheetLines(allOrders, catalog, id);
  const usedLitersElsewhere: Record<string, number> = {};
  for (const [key, liters] of usedMap) {
    usedLitersElsewhere[key] = liters;
  }

  const { needs: readyStockNeeds } = bottlesPerProductFromSheetLines(
    sheetLines as DeductionSheetLine[],
    catalogDeduction,
  );
  const created = order.createdAt ? formatDisplayDate(order.createdAt) : "";
  const backHref =
    fromParam === "admin"
      ? "/admin"
      : role === "batch_editor"
        ? "/production/batches"
        : "/orders";

  const rawDispatch = (order as { dispatch?: Partial<DispatchFields> }).dispatch;
  const initialDispatch: DispatchFields = {
    ...EMPTY_DISPATCH,
    vehicleNo: rawDispatch?.vehicleNo ?? "",
    driverName: rawDispatch?.driverName ?? "",
    dcNo: rawDispatch?.dcNo ?? "",
    helperName: rawDispatch?.helperName ?? "",
    productionIncharge: rawDispatch?.productionIncharge ?? "",
    securityName: rawDispatch?.securityName ?? "",
    driverSignature: rawDispatch?.driverSignature ?? "",
  };

  const dispatchTripIdRaw = (order as { dispatchTripId?: { toString(): string } | null }).dispatchTripId;
  const dispatchTripId = dispatchTripIdRaw ? dispatchTripIdRaw.toString() : null;
  const dispatchTripHref = dispatchTripId ? `/dispatch/trips/${dispatchTripId}` : null;
  const weightsVerified = Boolean(
    (order as { weightsVerifiedAt?: Date | null }).weightsVerifiedAt,
  );
  const dispatchReadyForGate = Boolean(
    dispatchTripId &&
      initialDispatch.vehicleNo.trim() &&
      initialDispatch.driverName.trim() &&
      initialDispatch.dcNo.trim(),
  );

  return (
    <div className="space-y-4">
      <LoadingSheetBatchEditor
        orderId={id}
        poNumber={order.poNumber}
        customerName={order.customerName}
        createdDate={created}
        sheetLines={sheetLines}
        catalog={catalog}
        productionBatches={productionBatches}
        usedLitersElsewhere={usedLitersElsewhere}
        initialDispatch={initialDispatch}
        canEditDispatch={canEditDispatch}
        initialDispatchEditMode={initialDispatchEditMode}
        backHref={backHref}
        dispatchTripId={dispatchTripId}
        dispatchTripHref={dispatchTripHref}
        batchesLocked={batchesLocked}
        readyStockNeeds={readyStockNeeds}
        weightsVerified={weightsVerified}
        dispatchReadyForGate={dispatchReadyForGate}
      />
    </div>
  );
}
