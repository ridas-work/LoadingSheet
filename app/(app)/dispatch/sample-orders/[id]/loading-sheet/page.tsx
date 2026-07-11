import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import { SampleBatchAssignmentSheet, type SampleAssignLine } from "@/components/SampleBatchAssignmentSheet";
import { auth } from "@/lib/auth";
import { productsMatch } from "@/lib/batchVolume";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { isFieldSampleOrder } from "@/lib/sampleDispatch";
import { sampleBatchAvailability } from "@/lib/sampleProductionStock";
import { canAssignDispatchBatches, homePathForRole, roleFromSession } from "@/lib/roles";

type PageProps = { params: Promise<{ id: string }> };

export default async function SampleOrderLoadingSheetPage({ params }: PageProps) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canAssignDispatchBatches(role, username) && role !== "admin") {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  await connectToDatabase();
  const order = await Order.findById(id).lean();
  if (!order || !isFieldSampleOrder((order as { orderKind?: string }).orderKind)) notFound();

  const alreadyDeducted = Boolean(
    (order as { sampleStockDeductedAt?: Date | null }).sampleStockDeductedAt,
  );
  if (alreadyDeducted && canAssignDispatchBatches(role, username) && role !== "admin") {
    redirect("/dispatch/sample-orders");
  }

  const [catalogDocs, batchOptions] = await Promise.all([
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
      .lean(),
    sampleBatchAvailability(),
  ]);
  const catalog = packingCatalogFromDocs(catalogDocs);

  const lines: SampleAssignLine[] = (order.sheetLines ?? []).map((line) => ({
    boxNo: line.boxNo,
    productName: line.productName,
    bottlesPerBox: line.bottlesPerBox,
    batchNo: line.batchNo?.trim() ?? "",
    options: batchOptions
      .filter((b) => productsMatch(b.productName, line.productName, catalog))
      .map((b) => ({ batchNo: b.batchNo, remainingLiters: b.remainingLiters })),
  }));

  return (
    <SampleBatchAssignmentSheet
      orderId={id}
      poNumber={order.poNumber}
      customerName={order.customerName}
      repName={(order as { sampleRepName?: string }).sampleRepName?.trim() ?? ""}
      alreadyDeducted={alreadyDeducted}
      lines={lines}
    />
  );
}
