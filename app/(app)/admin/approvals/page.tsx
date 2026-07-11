import { redirect } from "next/navigation";

import { AdminFieldVisitSampleApprovalsTable } from "@/components/AdminFieldVisitSampleApprovalsTable";
import { AdminPoApprovalsTable } from "@/components/AdminPoApprovalsTable";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { pendingFieldVisitSampleMongoFilter, parseSampleMode } from "@/lib/fieldVisitTickets";
import { samplePoolForCatalog } from "@/lib/sampleProductionStock";
import { Order } from "@/lib/models/Order";
import { orderRequestTypeLabel, dedupePendingApprovalsByPoNumber, pendingApprovalMongoFilter } from "@/lib/orderApproval";
import { buildOrderPoDetail } from "@/lib/orderPoDetail";
import { homePathForRole, isAdmin, roleFromSession } from "@/lib/roles";

import { formatDateOnlyDisplay } from "@/lib/dateOnly";

type PageProps = {
  searchParams: Promise<{ subtractionQueued?: string }>;
};

export default async function AdminApprovalsPage({ searchParams }: PageProps) {
  const { subtractionQueued } = await searchParams;
  const showSubtractionBanner = subtractionQueued === "1";

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!isAdmin(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  await connectToDatabase();

  const catalogDocs = await ProductPacking.find({ active: true })
    .select({ code: 1, name: 1, bottlesPerCarton: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1 })
    .lean();
  const catalog = packingCatalogFromDocs(catalogDocs);
  const sampleStock = await samplePoolForCatalog(catalog);

  const fieldVisits = await FieldVisitTicket.find(pendingFieldVisitSampleMongoFilter())
    .sort({ sampleApprovalRequestedAt: -1, createdAt: -1 })
    .select({
      placeName: 1,
      customerName: 1,
      city: 1,
      contactPhone: 1,
      contactPerson: 1,
      notes: 1,
      sampleMode: 1,
      sampleProducts: 1,
      createdByName: 1,
      createdAt: 1,
      sampleApprovalRequestedAt: 1,
    })
    .lean();

  const visitRows = fieldVisits.map((v) => ({
    id: v._id.toString(),
    placeName: v.placeName?.trim() ?? "",
    customerName: v.customerName?.trim() ?? "",
    city: v.city?.trim() ?? "",
    contactPhone: v.contactPhone?.trim() ?? "",
    contactPerson: v.contactPerson?.trim() ?? "",
    notes: v.notes?.trim() ?? "",
    sampleMode: parseSampleMode(v.sampleMode) ?? "outgoing",
    sampleProducts: (v.sampleProducts ?? []).map((p) => ({
      productName: p.productName ?? "",
      notes: p.notes ?? "",
      bottles: typeof p.bottles === "number" && p.bottles >= 1 ? p.bottles : 1,
    })),
    createdByName: v.createdByName?.trim() ?? "",
    createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : "",
    requestedAt: v.sampleApprovalRequestedAt
      ? new Date(v.sampleApprovalRequestedAt).toISOString()
      : v.createdAt
        ? new Date(v.createdAt).toISOString()
        : "",
  }));

  const orders = await Order.find(pendingApprovalMongoFilter())
    .sort({ approvalRequestedAt: -1, createdAt: -1 })
    .select({
      poNumber: 1,
      customerName: 1,
      city: 1,
      deadlineDate: 1,
      createdByName: 1,
      createdAt: 1,
      sheetLines: 1,
      orderKind: 1,
      items: 1,
      mixedSample: 1,
      customCartons: 1,
      subtractedItems: 1,
      subtractedFromOrderId: 1,
    })
    .lean();

  const dedupedOrders = dedupePendingApprovalsByPoNumber(orders);

  const rows = dedupedOrders.map((o) => {
    const orderKind = (o as { orderKind?: string }).orderKind ?? "standard";
    return {
      id: o._id.toString(),
      poNumber: o.poNumber,
      customerName: o.customerName,
      city: o.city?.trim() ?? "",
      deadlineDisplay: formatDateOnlyDisplay(o.deadlineDate),
      createdByName: o.createdByName?.trim() ?? "",
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : "",
      cartonCount: (o.sheetLines ?? []).length,
      orderKind,
      requestTypeLabel: (o as { subtractedFromOrderId?: string | null }).subtractedFromOrderId
        ? "Subtracted from boss edit"
        : orderRequestTypeLabel(orderKind),
      isSubtractionRequest: Boolean((o as { subtractedFromOrderId?: string | null }).subtractedFromOrderId),
      detail: buildOrderPoDetail({
        orderKind,
        items: (o as { items?: Array<{ productName: string; boxes: number; bottlesPerBox: number }> }).items,
        mixedSample: (o as {
          mixedSample?: {
            boxCount?: number;
            contents?: Array<{ productName: string; bottles: number; bottleSizeCode?: string }>;
          };
        }).mixedSample,
        customCartons: (o as {
          customCartons?: Array<{
            boxCount: number;
            label?: string;
            customBoxCode?: string;
            contents: Array<{ productName: string; bottles: number; bottleSizeCode?: string }>;
          }>;
        }).customCartons,
        subtractedItems: (o as {
          subtractedItems?: Parameters<typeof buildOrderPoDetail>[0]["subtractedItems"];
        }).subtractedItems,
      }),
    };
  });

  return (
    <div className="space-y-6">
      {showSubtractionBanner ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          <p className="font-medium">Order saved — subtracted items sent for approval</p>
          <p className="mt-1 text-emerald-900">
            Review the subtracted lines in <strong>PO order approval</strong> below when you are ready.
            Approve to release them to Ali, or discard to void them permanently.
          </p>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Sample approvals</h1>
        <p className="mt-1 text-sm text-zinc-600">
          <strong>Step 1:</strong> Field reps request samples (Nouman, Javeria, Aslam, Ahtisham) — you approve
          here. <strong>Step 2:</strong> They record delivery and customer reaction after approval. PO sample
          orders from the order team also appear below.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Field visit sample requests</h2>
        <AdminFieldVisitSampleApprovalsTable visits={visitRows} sampleStock={sampleStock} />
      </div>

      <div id="po-order-approval" className="space-y-3 scroll-mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">PO order approval</h2>
        <AdminPoApprovalsTable orders={rows} />
      </div>
    </div>
  );
}
