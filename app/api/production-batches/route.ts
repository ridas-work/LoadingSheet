import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import {
  parseQcBody,
  resolveBatchFamily,
  serializeProductionBatch,
  trimQcField,
} from "@/lib/productionBatchApi";
import { loadBatchUsageContext, usageForBatchNo } from "@/lib/productionBatchStatus";
import { roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { usedMap } = await loadBatchUsageContext();
  const batches = await ProductionBatch.find({}).sort({ preparedAt: -1, createdAt: -1 }).lean();

  return NextResponse.json(
    batches.map((b) => {
      const usage = usageForBatchNo(b.batchNo, b.totalLiters, usedMap);
      return serializeProductionBatch({ ...b, ...usage });
    }),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "batch_editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const batchNo = trimQcField(body.batchNo);
  const productInput = trimQcField(body.productName);
  const totalLiters = typeof body.totalLiters === "number" ? body.totalLiters : Number(body.totalLiters);
  const preparedAt =
    typeof body.preparedAt === "string" && body.preparedAt ? new Date(body.preparedAt) : new Date();

  if (!batchNo) {
    return NextResponse.json({ error: "Batch number is required" }, { status: 400 });
  }
  if (!productInput) {
    return NextResponse.json({ error: "Product is required" }, { status: 400 });
  }
  if (!Number.isFinite(totalLiters) || totalLiters <= 0) {
    return NextResponse.json({ error: "Total liters must be greater than 0" }, { status: 400 });
  }

  const qc = parseQcBody(body, true);
  if (!qc.ok) {
    return NextResponse.json({ error: qc.error }, { status: 400 });
  }

  const batchFamily = await resolveBatchFamily(productInput);
  if (!batchFamily) {
    return NextResponse.json({ error: "Product must exist in catalog" }, { status: 400 });
  }

  await connectToDatabase();

  const existing = await ProductionBatch.findOne({ batchNo }).lean();
  if (existing) {
    return NextResponse.json({ error: `Batch "${batchNo}" already exists` }, { status: 409 });
  }

  const doc = await ProductionBatch.create({
    batchNo,
    productName: batchFamily,
    totalLiters,
    preparedAt,
    ...qc.fields,
    createdByUserId: userId,
    createdByName: session.user.name ?? "",
  });

  return NextResponse.json({ id: doc._id.toString(), batchNo: doc.batchNo }, { status: 201 });
}