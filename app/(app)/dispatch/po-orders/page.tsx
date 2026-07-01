import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { RashidPoOrdersList } from "@/components/RashidPoOrdersList";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { normalizeGateStatus } from "@/lib/gateDelivery";
import { Order } from "@/lib/models/Order";
import { buildOrderPoDetail } from "@/lib/orderPoDetail";
import { rashidPendingPoOrdersMongoFilter } from "@/lib/rashidPoOrders";
import { pendingSubtractionCount } from "@/lib/subtractedItems";
import { canViewRashidPoOrders, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function RashidPoOrdersPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canViewRashidPoOrders(role, username)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  await connectToDatabase();

  const orders = await Order.find(rashidPendingPoOrdersMongoFilter())
    .sort({ createdAt: -1 })
    .select(
      "poNumber customerName createdAt createdByName gateDeliveryStatus orderKind items mixedSample customCartons subtractedItems",
    )
    .lean();

  const rows = orders.map((o) => {
    const subtractedItems = (o as { subtractedItems?: Parameters<typeof buildOrderPoDetail>[0]["subtractedItems"] })
      .subtractedItems;
    return {
      id: o._id.toString(),
      poNumber: o.poNumber,
      customerName: o.customerName,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : "",
      createdByName: (o as { createdByName?: string }).createdByName?.trim() ?? "",
      gateDeliveryStatus: normalizeGateStatus(
        (o as { gateDeliveryStatus?: unknown }).gateDeliveryStatus,
      ),
      pendingLineCount: pendingSubtractionCount(subtractedItems),
      detail: buildOrderPoDetail({
        orderKind: (o as { orderKind?: string }).orderKind,
        items: (o as { items?: Array<{ productName: string; boxes: number; bottlesPerBox: number }> }).items,
        mixedSample: (o as {
          mixedSample?: {
            boxCount?: number;
            contents?: Array<{ productName: string; bottles: number; bottleSizeCode?: string; packingCode?: string }>;
          };
        }).mixedSample,
        customCartons: (o as {
          customCartons?: Array<{
            boxCount: number;
            label?: string;
            customBoxCode?: string;
            contents: Array<{
              productName: string;
              bottles: number;
              bottleSizeCode?: string;
              packingCode?: string;
            }>;
          }>;
        }).customCartons,
        subtractedItems,
      }),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending PO details"
        description="All factory orders not yet delivered — at gate or pending redelivery. Read-only PO detail; use Trips & batches for loading sheets and batch assignment."
      />

      {rows.length === 0 ? (
        <p className="empty-state">No undelivered orders at the factory right now.</p>
      ) : (
        <RashidPoOrdersList orders={rows} />
      )}
    </div>
  );
}
