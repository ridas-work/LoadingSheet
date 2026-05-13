import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { LoadingSheetBatchEditor, type LoadingSheetLine } from "@/components/LoadingSheetBatchEditor";
import { auth } from "@/lib/auth";
import { buildSheetLines, type OrderItemInput, type SheetLine } from "@/lib/buildSheetLines";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { roleFromSession } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
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
  const { edit } = await props.searchParams;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const canEditBatches = role === "batch_editor";
  const initialEditMode = canEditBatches && edit === "1";

  await connectToDatabase();
  const order = await Order.findById(id).lean();
  if (!order) notFound();

  const sheetLines = normalizeSheetLines(order as Parameters<typeof normalizeSheetLines>[0]);
  const created = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : "";
  const backHref = role === "batch_editor" ? "/production/batches" : "/orders";

  return (
    <LoadingSheetBatchEditor
      orderId={id}
      poNumber={order.poNumber}
      customerName={order.customerName}
      createdDate={created}
      sheetLines={sheetLines}
      canEditBatches={canEditBatches}
      initialEditMode={initialEditMode}
      backHref={backHref}
    />
  );
}
