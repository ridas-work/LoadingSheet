import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  computeWasteLiters,
  fillingLineSnapshots,
  parseNonNegativeBottleCount,
  parseNonNegativeLiters,
  todayIsoDate,
  totalPackingLineSnapshots,
  type BottlePackingLine,
} from "@/lib/batchFillingWaste";
import { roundLiters } from "@/lib/batchVolume";
import {
  packingCatalogFromDocs,
  packingOptionsForBatchProduct,
  type FillingPackingOption,
} from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { computeFillingUipIncrements } from "@/lib/packagingFillingDeduction";
import { applyPackagingUipIncrements } from "@/lib/packagingStockApply";
import { syncReadyBottleLedgerFromFilling } from "@/lib/readyBottleFillingSync";
import { BatchFillingDailyEntry } from "@/lib/models/BatchFillingDailyEntry";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import type { DeductionPackagingItem, DeductionPacking } from "@/lib/packagingDeduction";
import { canEditDispatch, isAdmin, roleFromSession } from "@/lib/roles";
import {
  loadBatchUsageContext,
  usageForBatchNo,
} from "@/lib/productionBatchStatus";

function canView(role: ReturnType<typeof roleFromSession>): boolean {
  return role === "dispatch_editor" || isAdmin(role);
}

type StoredPackingLine = BottlePackingLine & {
  productCode: string;
  productName: string;
  filledLitersTodaySnapshot?: number;
  readyToDeliverLitersSnapshot?: number;
};

type StoredEntry = {
  batchNo: string;
  entryDate: string;
  packingLines?: StoredPackingLine[];
  filledLitersToday: number;
  readyToDeliverLiters: number;
  physicalRemainingLiters: number;
  systemRemainingLiters: number;
  wasteLiters: number;
  note?: string | null;
  recordedByName?: string | null;
  updatedAt?: Date;
};

function serializePackingLine(line: StoredPackingLine) {
  const snapshots = fillingLineSnapshots(line);
  return {
    productCode: line.productCode,
    productName: line.productName,
    litersPerBottle: line.litersPerBottle,
    filledBottlesToday: line.filledBottlesToday,
    readyToDeliverBottles: line.readyToDeliverBottles,
    filledLitersTodaySnapshot: line.filledLitersTodaySnapshot ?? snapshots.filledLitersTodaySnapshot,
    readyToDeliverLitersSnapshot:
      line.readyToDeliverLitersSnapshot ?? snapshots.readyToDeliverLitersSnapshot,
  };
}

function serializeEntry(entry: StoredEntry) {
  const packingLines = (entry.packingLines ?? []).map(serializePackingLine);
  return {
    filledLitersToday: entry.filledLitersToday,
    readyToDeliverLiters: entry.readyToDeliverLiters,
    packingLines,
    legacyLitersOnly: packingLines.length === 0 && (entry.filledLitersToday > 0 || entry.readyToDeliverLiters > 0),
    physicalRemainingLiters: entry.physicalRemainingLiters,
    systemRemainingLiters: entry.systemRemainingLiters,
    wasteLiters: entry.wasteLiters,
    note: entry.note ?? "",
    recordedByName: entry.recordedByName ?? "",
    updatedAt: entry.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date")?.trim() || todayIsoDate();

  await connectToDatabase();

  const [batches, { usedMap, catalog: usageCatalog }, entries, catalogDocs] = await Promise.all([
    ProductionBatch.find({}).sort({ preparedAt: -1 }).lean(),
    loadBatchUsageContext(),
    BatchFillingDailyEntry.find({ entryDate: date }).lean(),
    ProductPacking.find({ active: true })
      .select({ code: 1, name: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1, bundleComponents: 1 })
      .lean(),
  ]);
  const catalog = packingCatalogFromDocs(catalogDocs);

  const entryByBatch = new Map(entries.map((e) => [e.batchNo.toLowerCase(), e]));

  const rows = batches
    .map((b) => {
      const usage = usageForBatchNo(b.batchNo, b.totalLiters, usedMap, b.productName, usageCatalog);
      if (usage.status === "empty" && !entryByBatch.has(b.batchNo.toLowerCase())) {
        return null; // hide fully-used batches with no entry today
      }
      const entry = entryByBatch.get(b.batchNo.toLowerCase());
      return {
        batchNo: b.batchNo,
        productName: b.productName,
        totalLiters: b.totalLiters,
        usedLiters: usage.usedLiters,
        systemRemainingLiters: usage.remainingLiters,
        status: usage.status,
        packingOptions: packingOptionsForBatchProduct(b.productName, catalog),
        entry: entry ? serializeEntry(entry as StoredEntry) : null,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ date, rows });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditDispatch(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    batchNo?: unknown;
    entryDate?: unknown;
    packingLines?: unknown;
    physicalRemainingLiters?: unknown;
    note?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const batchNo = typeof body.batchNo === "string" ? body.batchNo.trim() : "";
  const entryDate = typeof body.entryDate === "string" ? body.entryDate.trim() : todayIsoDate();
  if (!batchNo) return NextResponse.json({ error: "batchNo is required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate))
    return NextResponse.json({ error: "entryDate must be YYYY-MM-DD" }, { status: 400 });

  const physical = parseNonNegativeLiters(body.physicalRemainingLiters, "Physical remaining");
  if (typeof physical === "object") return NextResponse.json({ error: physical.error }, { status: 400 });

  const note = typeof body.note === "string" ? body.note.trim() : "";

  await connectToDatabase();

  const [batch, catalogDocs, previousEntry, packagingItems] = await Promise.all([
    ProductionBatch.findOne({ batchNo }).lean(),
    ProductPacking.find({ active: true })
      .select({
        code: 1,
        name: 1,
        bottlesPerCarton: 1,
        litersPerBottle: 1,
        aliases: 1,
        batchFamily: 1,
        bundleComponents: 1,
      })
      .lean(),
    BatchFillingDailyEntry.findOne({ batchNo, entryDate }).lean(),
    PackagingItem.find({ active: true }).lean(),
  ]);
  if (!batch) return NextResponse.json({ error: `Batch "${batchNo}" not found` }, { status: 404 });
  const catalog = packingCatalogFromDocs(catalogDocs);
  const options = packingOptionsForBatchProduct(batch.productName, catalog);
  const optionByCode = new Map(options.map((option) => [option.code.trim().toLowerCase(), option]));

  const { usedMap, catalog: usageCatalog } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batchNo, batch.totalLiters, usedMap, batch.productName, usageCatalog);
  const systemRemaining = roundLiters(usage.remainingLiters);
  const rawLines = Array.isArray(body.packingLines) ? body.packingLines : [];
  const packingLines: StoredPackingLine[] = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const raw = rawLines[i] as Record<string, unknown>;
    const filledBottlesToday = parseNonNegativeBottleCount(
      raw?.filledBottlesToday ?? 0,
      `Filled bottles row ${i + 1}`,
    );
    if (typeof filledBottlesToday === "object") {
      return NextResponse.json({ error: filledBottlesToday.error }, { status: 400 });
    }

    const readyToDeliverBottles = parseNonNegativeBottleCount(
      raw?.readyToDeliverBottles ?? 0,
      `Ready bottles row ${i + 1}`,
    );
    if (typeof readyToDeliverBottles === "object") {
      return NextResponse.json({ error: readyToDeliverBottles.error }, { status: 400 });
    }

    const productCode = typeof raw?.productCode === "string" ? raw.productCode.trim().toLowerCase() : "";
    const hasBottles = filledBottlesToday > 0 || readyToDeliverBottles > 0;
    if (!productCode && !hasBottles) continue;
    if (!productCode) {
      return NextResponse.json({ error: `Select a product/packing for row ${i + 1}` }, { status: 400 });
    }

    const option: FillingPackingOption | undefined = optionByCode.get(productCode);
    if (!option) {
      return NextResponse.json(
        { error: `Product/packing is not valid for batch "${batch.productName}" on row ${i + 1}` },
        { status: 400 },
      );
    }
    if (!hasBottles) continue;

    const baseLine = {
      productCode: option.code,
      productName: option.name,
      litersPerBottle: option.litersPerBottle,
      filledBottlesToday,
      readyToDeliverBottles,
    };
    packingLines.push({
      ...baseLine,
      ...fillingLineSnapshots(baseLine),
    });
  }

  const { filledLitersToday, readyToDeliverLiters } = totalPackingLineSnapshots(packingLines);
  const wasteLiters = computeWasteLiters(systemRemaining, filledLitersToday, readyToDeliverLiters, physical);

  const catalogDeduction: DeductionPacking[] = catalog.map((p) => ({
    code: p.code,
    name: p.name,
    bottlesPerCarton: p.bottlesPerCarton,
    aliases: p.aliases,
    batchFamily: p.batchFamily,
    bundleComponents: p.bundleComponents,
  }));
  const previousLines = (previousEntry?.packagingUipApplied ?? []).length
    ? (previousEntry?.packagingUipApplied ?? []).map((a) => ({
        productCode: a.productCode,
        filledBottlesToday: a.filledBottlesApplied,
      }))
    : (previousEntry?.packingLines ?? []).map((l) => ({
        productCode: l.productCode,
        filledBottlesToday: l.filledBottlesToday ?? 0,
      }));

  const newLines = packingLines.map((l) => ({
    productCode: l.productCode,
    filledBottlesToday: l.filledBottlesToday,
  }));

  const uipPreview = computeFillingUipIncrements({
    previousLines,
    newLines,
    catalog: catalogDeduction,
    packagingItems: packagingItems as DeductionPackagingItem[],
  });

  if (uipPreview.missingMappings.length > 0) {
    return NextResponse.json(
      { error: `Packaging mapping missing: ${uipPreview.missingMappings.join("; ")}` },
      { status: 400 },
    );
  }
  if (uipPreview.insufficientStock.length > 0) {
    return NextResponse.json({ error: uipPreview.insufficientStock.join("; ") }, { status: 400 });
  }

  if (uipPreview.increments.length > 0) {
    const applyError = await applyPackagingUipIncrements(
      uipPreview.increments.map((i) => ({
        itemCode: i.itemCode,
        quantity: i.quantity,
        detail: i.detail,
      })),
      {
        reason: "filling",
        note: `Batch ${batchNo} filling ${entryDate}`,
        recordedByUserId: userId,
        recordedByName: session.user.name ?? "",
      },
    );
    if (applyError) {
      return NextResponse.json({ error: applyError }, { status: 400 });
    }
  }

  const readySync = await syncReadyBottleLedgerFromFilling({
    previousApplied: (previousEntry?.readyLedgerApplied ?? []).map((a) => ({
      productCode: a.productCode,
      readyBottlesApplied: a.readyBottlesApplied,
    })),
    previousPackingLines: (previousEntry?.packingLines ?? []).map((l) => ({
      productCode: l.productCode,
      productName: l.productName,
      readyToDeliverBottles: l.readyToDeliverBottles ?? 0,
    })),
    newPackingLines: packingLines.map((l) => ({
      productCode: l.productCode,
      productName: l.productName,
      readyToDeliverBottles: l.readyToDeliverBottles,
    })),
    batchNo,
    batchProductName: batch.productName,
    nimraLinked: true,
    entryDate,
    audit: { userId, userName: session.user.name ?? "" },
  });
  if (readySync.error) {
    return NextResponse.json({ error: readySync.error }, { status: 400 });
  }

  const packagingUipApplied = newLines.map((l) => ({
    productCode: l.productCode,
    filledBottlesApplied: l.filledBottlesToday,
  }));

  const result = await BatchFillingDailyEntry.findOneAndUpdate(
    { batchNo, entryDate },
    {
      $set: {
        packingLines,
        filledLitersToday,
        readyToDeliverLiters,
        physicalRemainingLiters: physical,
        systemRemainingLiters: systemRemaining,
        wasteLiters,
        note,
        packagingUipApplied,
        readyLedgerApplied: readySync.applied,
        recordedByUserId: userId,
        recordedByName: session.user.name ?? "",
      },
    },
    { upsert: true, new: true },
  );

  return NextResponse.json({
    entry: {
      batchNo: result.batchNo,
      entryDate: result.entryDate,
      ...serializeEntry(result as StoredEntry),
    },
  });
}
