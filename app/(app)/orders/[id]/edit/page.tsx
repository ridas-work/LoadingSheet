import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import { AdminOrderEditForm, type AdminOrderInitial } from "@/components/AdminOrderEditForm";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { canEditOrders, roleFromSession } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditOrderPage({ params }: PageProps) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (!canEditOrders(role)) {
    redirect("/orders");
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();
  const order = await Order.findById(id).lean();
  if (!order) notFound();

  const lines = order.sheetLines ?? [];
  const hasBatchAssignments = lines.some((l) => {
    if (l.lineKind === "mixed_sample") {
      return (l.componentBatches ?? []).some((c) => c.batchNo?.trim());
    }
    return Boolean(l.batchNo?.trim());
  });

  const deadline =
    order.deadlineDate && !Number.isNaN(new Date(order.deadlineDate).getTime())
      ? new Date(order.deadlineDate).toISOString().slice(0, 10)
      : "";

  const customCartonsRaw = (order as { customCartons?: unknown }).customCartons;
  const customCartons = Array.isArray(customCartonsRaw)
    ? (customCartonsRaw as Array<{
        boxCount: number;
        contents: Array<{ productName: string; bottles: number }>;
        label?: string;
      }>)
    : [];

  const initial: AdminOrderInitial = {
    orderId: order._id.toString(),
    poNumber: order.poNumber,
    customerName: order.customerName,
    city: order.city ?? "",
    deadlineDate: deadline,
    orderKind: order.orderKind === "mixed_sample" ? "mixed_sample" : "standard",
    mixedBoxCount: order.mixedSample?.boxCount ?? 1,
    standardItems: (order.items ?? []).map((i) => ({
      productName: i.productName,
      boxes: i.boxes,
      bottlesPerBox: i.bottlesPerBox,
    })),
    mixedContents: order.mixedSample?.contents ?? [],
    customCartons,
    hasBatchAssignments,
    onDispatchTrip: Boolean(order.dispatchTripId),
    createdByName: order.createdByName ?? "",
  };

  return (
    <div className="space-y-4">
      <Link href="/orders" className="text-sm font-medium text-zinc-700 underline">
        ← Orders
      </Link>
      <AdminOrderEditForm initial={initial} />
    </div>
  );
}
