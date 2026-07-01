import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import {
  parseBatchKind,
  parseProductionPurpose,
  parseQcBody,
  parseTotalLitersFromQuantity,
  resolveBatchProduct,
  serializeProductionBatch,
  trimQcField,
} from "@/lib/productionBatchApi";
import { parseQcOutcomeBody } from "@/lib/productionBatchQc";
import { loadBatchUsageContext, usageForBatchNo } from "@/lib/productionBatchStatus";
import {
  remainingSampleLitersForBatch,
  regularProductionBatchMongoFilter,
  sampleProductionBatchMongoFilter,
} from "@/lib/sampleProductionStock";
import { openProductionBatchMongoFilter } from "@/lib/productionBatchClose";
import { roleFromSession } from "@/lib/roles";

function purposeMongoFilter(purpose: string | null): Record<string, unknown> {
  if (purpose === "regular") return regularProductionBatchMongoFilter();
  if (purpose === "sample") return sampleProductionBatchMongoFilter();
  return openProductionBatchMongoFilter();
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const purpose = url.searchParams.get("purpose");

  await connectToDatabase();
  const { usedMap, catalog } = await loadBatchUsageContext();
  const batches = await ProductionBatch.find(purposeMongoFilter(purpose))
    .sort({ preparedAt: -1, createdAt: -1 })
    .lean();

  const sampleIds = batches.filter((b) => b.productionPurpose === "sample").map((b) => b._id);
  const sampleRemaining = new Map<string, number>();
  if (sampleIds.length > 0) {
    for (const b of batches) {
      if (b.productionPurpose === "sample") {
        sampleRemaining.set(
          b._id.toString(),
          await remainingSampleLitersForBatch({ _id: b._id, totalLiters: b.totalLiters }),
        );
      }
    }
  }

  return NextResponse.json(
    batches.map((b) => {
      const isSample = b.productionPurpose === "sample";
      const usage = isSample
        ? {
            usedLiters: roundSampleUsed(b.totalLiters, sampleRemaining.get(b._id.toString()) ?? 0),
            remainingLiters: sampleRemaining.get(b._id.toString()) ?? b.totalLiters,
            status: "available" as const,
            locked: false,
          }
        : usageForBatchNo(b.batchNo, b.totalLiters, usedMap, b.productName, catalog);
      return serializeProductionBatch({
        ...b,
        ...usage,
        ...(isSample ? { remainingSampleLiters: sampleRemaining.get(b._id.toString()) ?? 0 } : {}),
      });
    }),
  );
}

function roundSampleUsed(total: number, remaining: number): number {
  return Math.max(0, Math.round((total - remaining) * 1000) / 1000);
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
  const preparedAt =
    typeof body.preparedAt === "string" && body.preparedAt ? new Date(body.preparedAt) : new Date();

  if (!batchNo) {
    return NextResponse.json({ error: "Batch number is required" }, { status: 400 });
  }
  if (!productInput) {
    return NextResponse.json({ error: "Product is required" }, { status: 400 });
  }

  const batchKind = parseBatchKind(body.batchKind);
  const productionPurpose = parseProductionPurpose(body.productionPurpose);
  const resolvedProduct = await resolveBatchProduct(productInput, batchKind);
  if (!resolvedProduct) {
    return NextResponse.json(
      {
        error:
          batchKind === "custom_box"
            ? "Product must be in the custom box list"
            : "Product must exist in catalog",
      },
      { status: 400 },
    );
  }

  const qc = parseQcBody(body, true, { productFamily: resolvedProduct, batchKind });
  if (!qc.ok) {
    return NextResponse.json({ error: qc.error }, { status: 400 });
  }

  const fromQuantity = parseTotalLitersFromQuantity(qc.fields.quantity);
  const bodyLiters =
    typeof body.totalLiters === "number" ? body.totalLiters : Number(body.totalLiters);
  const totalLiters = fromQuantity ?? (Number.isFinite(bodyLiters) ? bodyLiters : NaN);
  if (!Number.isFinite(totalLiters) || totalLiters <= 0) {
    return NextResponse.json(
      { error: "Quantity must be in liters (e.g. 350 or 450L)" },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const qcOutcomeParsed = parseQcOutcomeBody(body);
  if (!qcOutcomeParsed.ok) {
    return NextResponse.json({ error: qcOutcomeParsed.error }, { status: 400 });
  }

  const existing = await ProductionBatch.findOne({ batchNo, productName: resolvedProduct }).lean();
  if (existing) {
    return NextResponse.json(
      { error: `Batch "${batchNo}" already exists for ${resolvedProduct}` },
      { status: 409 },
    );
  }

  const doc = await ProductionBatch.create({
    batchNo,
    batchKind,
    productionPurpose,
    productName: resolvedProduct,
    totalLiters,
    preparedAt,
    ...qc.fields,
    qcOutcome: qcOutcomeParsed.outcome,
    qcComment: qcOutcomeParsed.outcome === "rejected" ? qcOutcomeParsed.comment : "",
    qcStatusAt: new Date(),
    qcStatusByUserId: userId,
    qcStatusByName: session.user.name ?? "",
    createdByUserId: userId,
    createdByName: session.user.name ?? "",
  });

  return NextResponse.json({ id: doc._id.toString(), batchNo: doc.batchNo }, { status: 201 });
}
