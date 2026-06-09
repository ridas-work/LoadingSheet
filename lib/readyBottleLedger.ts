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

export async function addBatchLot(args: {
  batchNo: string;
  productCode: string;
  productName: string;
  bottles: number;
  note?: string;
  nimraLinked?: boolean;
  batchProductName?: string;
  audit: ReadyBottleAudit;
}): Promise<string | null> {
  const batchNo = args.batchNo.trim();
  const code = args.productCode.trim().toLowerCase();
  if (!batchNo) return "Batch number is required.";
  if (!code) return "Product is required.";
  if (!Number.isInteger(args.bottles) || args.bottles < 1) {
    return "Bottles must be a whole number ≥ 1.";
  }

  const existing = await ReadyBottleBatchLot.findOne({ batchNo, productCode: code }).lean();
  if (existing) {
    const delta = args.bottles - existing.bottles;
    if (delta === 0) return null;
    await ReadyBottleBatchLot.findOneAndUpdate(
      { batchNo, productCode: code },
      {
        $set: {
          productName: args.productName,
          bottles: args.bottles,
          nimraLinked: args.nimraLinked ?? existing.nimraLinked ?? false,
          batchProductName: args.batchProductName ?? existing.batchProductName ?? "",
          note: args.note ?? existing.note ?? "",
          recordedByUserId: args.audit.userId,
          recordedByName: args.audit.userName,
        },
      },
    );
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
