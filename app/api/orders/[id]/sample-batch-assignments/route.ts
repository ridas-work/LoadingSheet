import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { normalizeBatchNo, productsMatch } from "@/lib/batchVolume";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { canAssignDispatchBatches, roleFromSession } from "@/lib/roles";
import { isFieldSampleOrder } from "@/lib/sampleDispatch";
import { sampleDeductionLinesFromSheet } from "@/lib/sampleOrderFromVisit";
import { deductSampleProduction, sampleBatchAvailability } from "@/lib/sampleProductionStock";

type AssignmentInput = { boxNo?: unknown; batchNo?: unknown };

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { role?: string; username?: string; name?: string | null };
  const role = roleFromSession(user);
  if (!canAssignDispatchBatches(role, user.username)) {
    return NextResponse.json({ error: "Only Rashid can assign sample batches." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { assignments?: unknown } | null;
  if (!body || !Array.isArray(body.assignments)) {
    return NextResponse.json({ error: "assignments array is required" }, { status: 400 });
  }

  const assignmentByBox = new Map<number, string>();
  for (const raw of body.assignments as AssignmentInput[]) {
    const boxNo = typeof raw.boxNo === "number" ? raw.boxNo : Number(raw.boxNo);
    if (!Number.isInteger(boxNo) || boxNo < 1) continue;
    assignmentByBox.set(boxNo, typeof raw.batchNo === "string" ? normalizeBatchNo(raw.batchNo) : "");
  }

  await connectToDatabase();
  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isFieldSampleOrder(order.orderKind)) {
    return NextResponse.json(
      { error: "This route is only for field sample orders." },
      { status: 400 },
    );
  }
  if (order.sampleStockDeductedAt) {
    return NextResponse.json(
      { error: "Sample batches are locked — stock was already deducted for this order." },
      { status: 403 },
    );
  }

  const [catalogDocs, batchOptions] = await Promise.all([
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
      .lean(),
    sampleBatchAvailability(),
  ]);
  const catalog = packingCatalogFromDocs(catalogDocs);

  for (const line of order.sheetLines ?? []) {
    const incoming = assignmentByBox.get(line.boxNo);
    if (incoming === undefined) continue;
    if (incoming) {
      const match = batchOptions.find(
        (b) => b.batchNo === incoming && productsMatch(b.productName, line.productName, catalog),
      );
      if (!match) {
        return NextResponse.json(
          { error: `Batch "${incoming}" is not a sample batch for ${line.productName}.` },
          { status: 400 },
        );
      }
    }
    line.set("batchNo", incoming);
    line.set("componentBatches", []);
  }

  const allAssigned =
    (order.sheetLines ?? []).length > 0 &&
    (order.sheetLines ?? []).every((l) => (l.batchNo ?? "").trim().length > 0);

  let deducted = false;
  if (allAssigned) {
    const ticketId = order.fieldVisitTicketId ? order.fieldVisitTicketId.toString() : "";
    if (!ticketId) {
      return NextResponse.json(
        { error: "This sample order is not linked to a field visit ticket." },
        { status: 400 },
      );
    }
    const products = sampleDeductionLinesFromSheet(
      (order.sheetLines ?? []).map((l) => ({
        productName: l.productName,
        bottlesPerBox: l.bottlesPerBox,
      })),
    );
    const result = await deductSampleProduction({
      products,
      visitTicketId: ticketId,
      actor: { userName: user.name ?? "", username: user.username ?? "" },
      catalog,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    order.sampleStockDeductedAt = new Date();
    // Samples ship in single bottles — skip standard carton-weight gating so the
    // order can reach Zaman's gate once it is on a sample trip.
    order.weightsVerifiedAt = new Date();
    deducted = true;

    await FieldVisitTicket.findByIdAndUpdate(ticketId, { sampleDispatchStatus: "batched" });
  }

  order.batchUpdatedByName = user.name ?? "";
  order.batchUpdatedAt = new Date();
  await order.save();

  return NextResponse.json({ ok: true, deducted, fullyAssigned: allAssigned });
}
