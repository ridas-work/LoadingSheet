import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { LoadingSheetBatchEditor, type LoadingSheetLine } from "@/components/LoadingSheetBatchEditor";
import { auth } from "@/lib/auth";
import { accumulateBatchUsageFromOrders, inferLitersPerBottleFromName, type CatalogProduct } from "@/lib/batchVolume";
import { buildSheetLines, type OrderItemInput, type SheetLine } from "@/lib/buildSheetLines";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { isBatchAssignmentLocked } from "@/lib/orderBatchStatus";
import { roleFromSession, EMPTY_DISPATCH, type DispatchFields } from "@/lib/roles";

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

  return sheetLines.map((row) => ({
    boxNo: row.boxNo,
    productName: row.productName,
    bottlesPerBox: row.bottlesPerBox,
    batchNo: row.batchNo ?? "",
    weight: row.weight ?? null,
  }));
}

export default async function LoadingSheetPage(props: PageProps) {
  const { id } = await props.params;
  const { dispatch: dispatchParam } = await props.searchParams;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const canEditDispatch = role === "dispatch_editor";

  await connectToDatabase();
  const [order, allOrders, poolDocs, catalogDocs] = await Promise.all([
    Order.findById(id).lean(),
    Order.find({}).select({ sheetLines: 1 }).lean(),
    ProductionBatch.find({}).sort({ preparedAt: -1 }).lean(),
    ProductPacking.find({ active: true }).select({ name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1 }).lean(),
  ]);

  if (!order) notFound();

  const batchesLocked = isBatchAssignmentLocked(order.sheetLines);
  const initialDispatchEditMode = canEditDispatch && dispatchParam === "1" && !batchesLocked;

  const catalog: CatalogProduct[] = catalogDocs.map((p) => ({
    name: p.name,
    litersPerBottle: inferLitersPerBottleFromName(p.name, p.litersPerBottle),
    aliases: p.aliases ?? [],
    batchFamily: p.batchFamily?.trim() || p.name,
  }));

  const productionBatches = poolDocs.map((p) => ({
    batchNo: p.batchNo,
    productName: p.productName,
    totalLiters: p.totalLiters,
  }));

  const usedMap = accumulateBatchUsageFromOrders(allOrders, catalog, id);
  const usedLitersElsewhere: Record<string, number> = {};
  for (const [key, liters] of usedMap) {
    usedLitersElsewhere[key] = liters;
  }

  const sheetLines = normalizeSheetLines(order as Parameters<typeof normalizeSheetLines>[0]);
  const created = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : "";
  const backHref = role === "batch_editor" ? "/production/batches" : "/orders";

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

  return (
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
    />
  );
}
