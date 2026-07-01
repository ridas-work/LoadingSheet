import { normalizeBatchNo } from "@/lib/batchVolume";
import { ReadyBottleBatchLot } from "@/lib/models/ReadyBottleBatchLot";
import {
  ReadyBottleMovement,
  type ReadyBottleMovementReason,
} from "@/lib/models/ReadyBottleMovement";
import { ReadyBottleStock } from "@/lib/models/ReadyBottleStock";

export type ReadyBottleAudit = {
  userId: string;
  userName: string;
};

export type ApplyDeltaArgs = {
  productCode: string;
  productName: string;
  delta: number;
  reason: ReadyBottleMovementReason;
  note?: string;
  batchNo?: string;
  orderId?: string;
  poNumber?: string;
  entryDate?: string;
  audit: ReadyBottleAudit;
  allowNegative?: boolean;
};

async function ensureStockRow(productCode: string, productName: string): Promise<number> {
  const existing = await ReadyBottleStock.findOne({ productCode }).lean();
  if (existing) return existing.onHandBottles;
  await ReadyBottleStock.create({
    productCode,
    productName,
    onHandBottles: 0,
  });
  return 0;
}

export async function getReadyStockMap(): Promise<Map<string, number>> {
  const rows = await ReadyBottleStock.find({}).lean();
  return new Map(rows.map((r) => [r.productCode, r.onHandBottles]));
}

export async function listReadyStockWithCatalog(
  catalog: Array<{ code: string; name: string }>,
): Promise<
  Array<{
    productCode: string;
    productName: string;
    onHandBottles: number;
    openingBalanceSetAt: string | null;
  }>
> {
  const stockRows = await ReadyBottleStock.find({}).lean();
  const byCode = new Map(stockRows.map((r) => [r.productCode, r]));

  return catalog
    .map((p) => {
      const code = p.code.trim().toLowerCase();
      const row = byCode.get(code);
      return {
        productCode: code,
        productName: p.name,
        onHandBottles: row?.onHandBottles ?? 0,
        openingBalanceSetAt: row?.openingBalanceSetAt
          ? new Date(row.openingBalanceSetAt).toISOString()
          : null,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

export async function applyReadyBottleDelta(args: ApplyDeltaArgs): Promise<string | null> {
  const code = args.productCode.trim().toLowerCase();
  if (!code) return "Product code is required.";
  if (!Number.isInteger(args.delta) || args.delta === 0) return null;

  const current = await ensureStockRow(code, args.productName);
  const next = current + args.delta;
  if (!args.allowNegative && next < 0) {
    return `Insufficient ready stock for ${args.productName}: need ${Math.abs(args.delta)}, on hand ${current}`;
  }

  await ReadyBottleStock.findOneAndUpdate(
    { productCode: code },
    {
      $set: {
        productName: args.productName,
        onHandBottles: Math.max(0, next),
        updatedByUserId: args.audit.userId,
        updatedByName: args.audit.userName,
        ...(args.reason === "opening_balance" || args.reason === "batch_lot_add"
          ? { openingBalanceSetAt: new Date() }
          : {}),
      },
    },
    { upsert: true },
  );

  await ReadyBottleMovement.create({
    productCode: code,
    productName: args.productName,
    delta: args.delta,
    onHandAfter: Math.max(0, next),
    reason: args.reason,
    note: args.note ?? "",
    batchNo: args.batchNo ?? "",
    orderId: args.orderId ?? null,
    poNumber: args.poNumber ?? "",
    entryDate: args.entryDate ?? "",
    recordedByUserId: args.audit.userId,
    recordedByName: args.audit.userName,
  });

  return null;
}

function normalizeBundleSetId(bundleSetId?: string | null): string {
  return bundleSetId?.trim() ?? "";
}

function lotLookupFilter(batchNo: string, productCode: string, bundleSetId?: string) {
  const code = productCode.trim().toLowerCase();
  const setId = normalizeBundleSetId(bundleSetId);
  return { batchNo, productCode: code, bundleSetId: setId };
}

/** Adjust a batch-scoped ready lot without changing aggregate on-hand (used after filling_ready). */
export async function applyReadyBatchLotDelta(args: {
  batchNo: string;
  productCode: string;
  productName: string;
  delta: number;
  bundleSetId?: string;
  batchProductName?: string;
  nimraLinked?: boolean;
  note?: string;
  audit: ReadyBottleAudit;
}): Promise<string | null> {
  const batchNo = normalizeBatchNo(args.batchNo);
  const code = args.productCode.trim().toLowerCase();
  if (!batchNo) return "Batch number is required.";
  if (!code) return "Product code is required.";
  if (!Number.isInteger(args.delta) || args.delta === 0) return null;

  const setId = normalizeBundleSetId(args.bundleSetId);
  if (setId) {
    const existing = await ReadyBottleBatchLot.findOne(lotLookupFilter(batchNo, code, setId)).lean();
    const current = existing?.bottles ?? 0;
    const next = current + args.delta;
    if (next < 0) {
      return `Insufficient ready batch lot for ${args.productName} (batch ${batchNo}): need ${Math.abs(args.delta)}, lot has ${current}`;
    }

    if (existing) {
      await ReadyBottleBatchLot.findOneAndUpdate(lotLookupFilter(batchNo, code, setId), {
        $set: {
          productName: args.productName,
          bottles: next,
          nimraLinked: args.nimraLinked ?? existing.nimraLinked ?? false,
          batchProductName: args.batchProductName ?? existing.batchProductName ?? "",
          note: args.note ?? existing.note ?? "",
          recordedByUserId: args.audit.userId,
          recordedByName: args.audit.userName,
        },
      });
      return null;
    }

    if (args.delta > 0) {
      await ReadyBottleBatchLot.create({
        batchNo,
        productCode: code,
        productName: args.productName,
        bottles: args.delta,
        nimraLinked: args.nimraLinked ?? false,
        batchProductName: args.batchProductName ?? "",
        note: args.note ?? "",
        bundleSetId: setId,
        recordedByUserId: args.audit.userId,
        recordedByName: args.audit.userName,
      });
      return null;
    }

    return `No ready batch lot for ${args.productName} (batch ${batchNo})`;
  }

  let remaining = Math.abs(args.delta);
  const lots = await ReadyBottleBatchLot.find({ batchNo, productCode: code })
    .sort({ createdAt: 1, bundleSetId: 1 })
    .lean();

  if (args.delta < 0) {
    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lot.bottles);
      if (take <= 0) continue;
      const next = lot.bottles - take;
      await ReadyBottleBatchLot.findOneAndUpdate(
        { _id: lot._id },
        {
          $set: {
            bottles: next,
            recordedByUserId: args.audit.userId,
            recordedByName: args.audit.userName,
          },
        },
      );
      remaining -= take;
    }
    if (remaining > 0) {
      const onHand = lots.reduce((sum, lot) => sum + lot.bottles, 0);
      return `Insufficient ready batch lot for ${args.productName} (batch ${batchNo}): need ${Math.abs(args.delta)}, lot has ${onHand}`;
    }
    return null;
  }

  const existing = lots.find((lot) => !normalizeBundleSetId(lot.bundleSetId)) ?? lots[0];
  if (existing) {
    await ReadyBottleBatchLot.findOneAndUpdate(
      { _id: existing._id },
      {
        $set: {
          productName: args.productName,
          bottles: existing.bottles + args.delta,
          nimraLinked: args.nimraLinked ?? existing.nimraLinked ?? false,
          batchProductName: args.batchProductName ?? existing.batchProductName ?? "",
          note: args.note ?? existing.note ?? "",
          recordedByUserId: args.audit.userId,
          recordedByName: args.audit.userName,
        },
      },
    );
    return null;
  }

  await ReadyBottleBatchLot.create({
    batchNo,
    productCode: code,
    productName: args.productName,
    bottles: args.delta,
    nimraLinked: args.nimraLinked ?? false,
    batchProductName: args.batchProductName ?? "",
    note: args.note ?? "",
    recordedByUserId: args.audit.userId,
    recordedByName: args.audit.userName,
  });
  return null;
}

export async function addBatchLot(args: {
  batchNo: string;
  productCode: string;
  productName: string;
  bottles: number;
  note?: string;
  nimraLinked?: boolean;
  batchProductName?: string;
  bundleCode?: string;
  bundleSetId?: string;
  audit: ReadyBottleAudit;
}): Promise<string | null> {
  const batchNo = args.batchNo.trim();
  const code = args.productCode.trim().toLowerCase();
  if (!batchNo) return "Batch number is required.";
  if (!code) return "Product is required.";
  if (!Number.isInteger(args.bottles) || args.bottles < 1) {
    return "Bottles must be a whole number ≥ 1.";
  }

  const bundleSetId = normalizeBundleSetId(args.bundleSetId);
  const existing = await ReadyBottleBatchLot.findOne(lotLookupFilter(batchNo, code, bundleSetId)).lean();
  if (existing) {
    const delta = args.bottles - existing.bottles;
    if (delta === 0) return null;
    await ReadyBottleBatchLot.findOneAndUpdate(lotLookupFilter(batchNo, code, bundleSetId), {
      $set: {
        productName: args.productName,
        bottles: args.bottles,
        nimraLinked: args.nimraLinked ?? existing.nimraLinked ?? false,
        batchProductName: args.batchProductName ?? existing.batchProductName ?? "",
        note: args.note ?? existing.note ?? "",
        bundleCode: args.bundleCode ?? existing.bundleCode ?? "",
        bundleSetId,
        recordedByUserId: args.audit.userId,
        recordedByName: args.audit.userName,
      },
    });
    return applyReadyBottleDelta({
      productCode: code,
      productName: args.productName,
      delta,
      reason: "batch_lot_add",
      note: args.note ?? `Batch ${batchNo} ready stock updated`,
      batchNo,
      audit: args.audit,
    });
  }

  await ReadyBottleBatchLot.create({
    batchNo,
    productCode: code,
    productName: args.productName,
    bottles: args.bottles,
    nimraLinked: args.nimraLinked ?? false,
    batchProductName: args.batchProductName ?? "",
    note: args.note ?? "",
    bundleCode: args.bundleCode ?? "",
    bundleSetId,
    recordedByUserId: args.audit.userId,
    recordedByName: args.audit.userName,
  });

  return applyReadyBottleDelta({
    productCode: code,
    productName: args.productName,
    delta: args.bottles,
    reason: "batch_lot_add",
    note: args.note ?? `Batch ${batchNo} pre-filled bottles`,
    batchNo,
    audit: args.audit,
  });
}

export async function listBatchLots(): Promise<
  Array<{
    id: string;
    batchNo: string;
    productCode: string;
    productName: string;
    bottles: number;
    nimraLinked: boolean;
    batchProductName: string;
    note: string;
    bundleCode: string;
    bundleSetId: string;
    createdAt: string | null;
    updatedAt: string | null;
  }>
> {
  const lots = await ReadyBottleBatchLot.find({}).sort({ createdAt: 1, batchNo: 1 }).lean();
  return lots.map((l) => ({
    id: l._id.toString(),
    batchNo: l.batchNo,
    productCode: l.productCode,
    productName: l.productName,
    bottles: l.bottles,
    nimraLinked: Boolean(l.nimraLinked),
    batchProductName: l.batchProductName ?? "",
    note: l.note ?? "",
    bundleCode: l.bundleCode ?? "",
    bundleSetId: l.bundleSetId ?? "",
    createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
    updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : null,
  }));
}

export async function previewDeltas(
  deltas: Array<{ productCode: string; productName: string; delta: number }>,
): Promise<string | null> {
  const map = await getReadyStockMap();
  const insufficient: string[] = [];
  for (const d of deltas) {
    if (d.delta >= 0) continue;
    const code = d.productCode.trim().toLowerCase();
    const onHand = map.get(code) ?? 0;
    const next = onHand + d.delta;
    if (next < 0) {
      insufficient.push(`${d.productName}: need ${Math.abs(d.delta)}, on hand ${onHand}`);
    }
  }
  return insufficient.length > 0 ? insufficient.join("; ") : null;
}
