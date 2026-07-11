import { redirect } from "next/navigation";

import { AdminOrdersList } from "@/components/AdminOrdersList";
import { PageHeader } from "@/components/PageHeader";
import { mergeOrderFilter } from "@/lib/customerAccountAccess";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { normalizeGateStatus } from "@/lib/gateDelivery";
import { Order } from "@/lib/models/Order";
import { batchProgress } from "@/lib/orderBatchStatus";
import { buildOrderPoDetail } from "@/lib/orderPoDetail";
import { notDiscardedOrdersMongoFilter } from "@/lib/orderDiscard";
import { canViewAdminOrdersList, canEditOrders, roleFromSession } from "@/lib/roles";
import { regularOrdersMongoFilter } from "@/lib/sampleDispatch";

import { formatDateOnlyDisplay } from "@/lib/dateOnly";

export default async function AdminOrdersPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canViewAdminOrdersList(role, username)) {
    redirect("/admin");
  }

  const allowEdit = canEditOrders(role, username);

  await connectToDatabase();

  const orders = await Order.find(
    await mergeOrderFilter({
      ...notDiscardedOrdersMongoFilter(),
      ...regularOrdersMongoFilter(),
    }),
  )
    .sort({ createdAt: -1 })
    .select(
      "_id poNumber customerName city deadlineDate createdAt createdByName sheetLines orderKind items mixedSample customCartons subtractedItems dispatchTripId dispatch.vehicleNo gateDeliveryStatus",
    )
    .lean();

  const rows = orders.map((o) => {
    const id = o._id.toString();
    const lines = o.sheetLines ?? [];
    const progress = batchProgress(lines);

    return {
      id,
      poNumber: o.poNumber,
      customerName: o.customerName,
      city: (o as { city?: string }).city?.trim() ?? "",
      deadlineDisplay: formatDateOnlyDisplay((o as { deadlineDate?: unknown }).deadlineDate as Date | string),
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : "",
      createdByName: (o as { createdByName?: string }).createdByName?.trim() ?? "",
      filled: progress.filled,
      total: progress.total,
      gateDeliveryStatus: normalizeGateStatus(
        (o as { gateDeliveryStatus?: unknown }).gateDeliveryStatus,
      ),
      detail: buildOrderPoDetail({
        orderKind: (o as { orderKind?: string }).orderKind,
        items: (o as { items?: Array<{ productName?: string; boxes?: number; bottlesPerBox?: number }> })
          .items,
        mixedSample: (o as { mixedSample?: unknown }).mixedSample as Parameters<
          typeof buildOrderPoDetail
        >[0]["mixedSample"],
        customCartons: (o as { customCartons?: unknown }).customCartons as Parameters<
          typeof buildOrderPoDetail
        >[0]["customCartons"],
        subtractedItems: (o as { subtractedItems?: unknown }).subtractedItems as Parameters<
          typeof buildOrderPoDetail
        >[0]["subtractedItems"],
      }),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="All purchase orders — view PO details here, or edit order lines before delivery."
      />

      {rows.length === 0 ? (
        <p className="empty-state">No orders yet.</p>
      ) : (
        <AdminOrdersList orders={rows} allowEdit={allowEdit} />
      )}
    </div>
  );
}
