import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { LoadingSheetBatchEditor, type LoadingSheetLine } from "@/components/LoadingSheetBatchEditor";
import { auth } from "@/lib/auth";
import type { BatchDef, CatalogProduct } from "@/lib/batchVolume";
import { inferLitersPerBottleFromName } from "@/lib/batchVolume";
import { buildSheetLines, type OrderItemInput, type SheetLine } from "@/lib/buildSheetLines";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { roleFromSession, EMPTY_DISPATCH, type DispatchFields } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; dispatch?: string }>;
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
  const { edit, dispatch: dispatchParam } = await props.searchParams;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const canEditBatches = role === "batch_editor";
  const canEditDispatch = role === "dispatch_editor";
  const initialEditMode = canEditBatches && edit === "1";
  const initialDispatchEditMode = canEditDispatch && dispatchParam === "1";

  await connectToDatabase();
  const [order, catalogDocs] = await Promise.all([
    Order.findById(id).lean(),
    ProductPacking.find({ active: true }).select({ name: 1, litersPerBottle: 1, aliases: 1 }).lean(),
  ]);

  if (!order) notFound();

  const catalog: CatalogProduct[] = catalogDocs.map((p) => ({
    name: p.name,
    litersPerBottle: inferLitersPerBottleFromName(p.name, p.litersPerBottle),
    aliases: p.aliases ?? [],
  }));

  const rawBatchDefs = (order as { batchDefs?: Array<{ batchNo?: string; totalLiters?: number }> }).batchDefs ?? [];
  const initialBatchDefs: BatchDef[] = rawBatchDefs
    .filter((d) => d.batchNo && typeof d.totalLiters === "number")
    .map((d) => ({ batchNo: String(d.batchNo).trim(), totalLiters: d.totalLiters as number }));

  const sheetLines = normalizeSheetLines(order as Parameters<typeof normalizeSheetLines>[0]);
  const created = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : "";
  const backHref =
    role === "batch_editor" ? "/production/batches" : "/orders";

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

  return (
    <LoadingSheetBatchEditor
      orderId={id}
      poNumber={order.poNumber}
      customerName={order.customerName}
      createdDate={created}
      sheetLines={sheetLines}
      catalog={catalog}
      initialBatchDefs={initialBatchDefs}
      canEditBatches={canEditBatches}
      initialEditMode={initialEditMode}
      initialDispatch={initialDispatch}
      canEditDispatch={canEditDispatch}
      initialDispatchEditMode={initialDispatchEditMode}
      backHref={backHref}
    />
  );
}
