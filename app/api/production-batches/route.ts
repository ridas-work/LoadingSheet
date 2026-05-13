import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const batches = await ProductionBatch.find({}).sort({ preparedAt: -1, createdAt: -1 }).lean();

  return NextResponse.json(
    batches.map((b) => ({
      id: b._id.toString(),
      batchNo: b.batchNo,
      productName: b.productName,
      totalLiters: b.totalLiters,
      preparedAt: b.preparedAt,
      notes: b.notes ?? "",
      createdByName: b.createdByName ?? "",
    })),
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

  const batchNo = typeof body.batchNo === "string" ? body.batchNo.trim() : "";
  const productName = typeof body.productName === "string" ? body.productName.trim() : "";
  const totalLiters = typeof body.totalLiters === "number" ? body.totalLiters : Number(body.totalLiters);
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const preparedAt =
    typeof body.preparedAt === "string" && body.preparedAt
      ? new Date(body.preparedAt)
      : new Date();

  if (!batchNo) {
    return NextResponse.json({ error: "Batch number is required" }, { status: 400 });
  }
  if (!productName) {
    return NextResponse.json({ error: "Product is required" }, { status: 400 });
  }
  if (!Number.isFinite(totalLiters) || totalLiters <= 0) {
    return NextResponse.json({ error: "Total liters must be greater than 0" }, { status: 400 });
  }

  await connectToDatabase();

  const catalogHit = await ProductPacking.findOne({
    active: true,
    $or: [{ name: productName }, { aliases: productName }],
  }).lean();
  if (!catalogHit) {
    return NextResponse.json({ error: "Product must exist in catalog" }, { status: 400 });
  }

  const existing = await ProductionBatch.findOne({ batchNo }).lean();
  if (existing) {
    return NextResponse.json({ error: `Batch "${batchNo}" already exists` }, { status: 409 });
  }

  const doc = await ProductionBatch.create({
    batchNo,
    productName: catalogHit.name,
    totalLiters,
    preparedAt,
    notes,
    createdByUserId: userId,
    createdByName: session.user.name ?? "",
  });

  return NextResponse.json({ id: doc._id.toString(), batchNo: doc.batchNo }, { status: 201 });
}
