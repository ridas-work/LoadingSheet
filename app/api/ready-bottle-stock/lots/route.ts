import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { addBatchLot } from "@/lib/readyBottleLedger";
import { canEditDispatch, roleFromSession } from "@/lib/roles";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditDispatch(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const batchNo = typeof body?.batchNo === "string" ? body.batchNo.trim() : "";
  const productCode = typeof body?.productCode === "string" ? body.productCode.trim().toLowerCase() : "";
  const bottles = Number(body?.bottles);
  let note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!batchNo) return NextResponse.json({ error: "Batch number is required." }, { status: 400 });
  if (!productCode) return NextResponse.json({ error: "Product is required." }, { status: 400 });
  if (!Number.isInteger(bottles) || bottles < 1) {
    return NextResponse.json({ error: "Bottles must be a whole number ≥ 1." }, { status: 400 });
  }

  await connectToDatabase();
  const [packing, nimraBatch] = await Promise.all([
    ProductPacking.findOne({ code: productCode, active: true }).lean(),
    ProductionBatch.findOne({ batchNo }).lean(),
  ]);
  if (!packing) return NextResponse.json({ error: "Product not found in catalog." }, { status: 400 });

  const catalog = packingCatalogFromDocs([packing]);
  const productName = catalog[0]?.name ?? packing.name;

  const nimraLinked = Boolean(nimraBatch);
  const batchProductName = nimraBatch?.productName?.trim() ?? "";

  if (!note) {
    note = nimraLinked
      ? "Pre-filled bottles linked to QC batch"
      : "Legacy batch — not in QC (liquid gone or never registered)";
  }

  if (nimraLinked && batchProductName) {
    const selected = normalizeKey(productName);
    const nimraProduct = normalizeKey(batchProductName);
    if (
      selected !== nimraProduct &&
      !nimraProduct.includes(selected) &&
      !selected.includes(nimraProduct)
    ) {
      note = `${note} (QC batch product: ${batchProductName})`;
    }
  }

  const err = await addBatchLot({
    batchNo,
    productCode,
    productName,
    bottles,
    note,
    nimraLinked,
    batchProductName,
    audit: { userId, userName: session.user.name ?? "" },
  });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  return NextResponse.json({
    ok: true,
    nimraLinked,
    message: nimraLinked
      ? `Ready stock saved and linked to QC batch ${batchNo}.`
      : `Legacy ready stock saved for batch label "${batchNo}" (not in QC).`,
  });
}
