import { normalizeBatchNo } from "@/lib/batchVolume";
import { BatchFillingDailyEntry } from "@/lib/models/BatchFillingDailyEntry";
import { Order } from "@/lib/models/Order";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ReadyBottleBatchLot } from "@/lib/models/ReadyBottleBatchLot";
import { ReadyBottleMovement } from "@/lib/models/ReadyBottleMovement";

function batchNoEquals(a: string, b: string): boolean {
  return normalizeBatchNo(a).toLowerCase() === normalizeBatchNo(b).toLowerCase();
}

function replaceBatchNoIfMatch(stored: string | undefined | null, oldNo: string, newNo: string): string {
  const current = stored ?? "";
  return batchNoEquals(current, oldNo) ? newNo : current;
}

export async function renameProductionBatchNo(
  batchId: string,
  oldBatchNo: string,
  productName: string,
  newBatchNoRaw: string,
): Promise<{ ok: true; newBatchNo: string } | { ok: false; error: string }> {
  const newBatchNo = normalizeBatchNo(newBatchNoRaw);
  if (!newBatchNo) {
    return { ok: false, error: "Batch number is required." };
  }
  if (batchNoEquals(oldBatchNo, newBatchNo)) {
    return { ok: true, newBatchNo };
  }

  const conflict = await ProductionBatch.findOne({
    _id: { $ne: batchId },
    batchNo: newBatchNo,
    productName,
  }).lean();
  if (conflict) {
    return {
      ok: false,
      error: `Batch "${newBatchNo}" already exists for ${productName}.`,
    };
  }

  const readyLots = await ReadyBottleBatchLot.find({});
  const lotsToRename = readyLots.filter((lot) => batchNoEquals(lot.batchNo, oldBatchNo));
  for (const lot of lotsToRename) {
    const existing = await ReadyBottleBatchLot.findOne({
      _id: { $ne: lot._id },
      batchNo: newBatchNo,
      productCode: lot.productCode,
      bundleSetId: lot.bundleSetId ?? "",
    });
    if (existing) {
      return {
        ok: false,
        error: `Ready stock already has batch "${newBatchNo}" for ${lot.productName}. Merge manually first.`,
      };
    }
  }

  const orders = await Order.find({}).select({ sheetLines: 1, batchDefs: 1, subtractedItems: 1 });

  for (const order of orders) {
    let changed = false;

    for (const line of order.sheetLines ?? []) {
      const nextBatch = replaceBatchNoIfMatch(line.batchNo, oldBatchNo, newBatchNo);
      if (nextBatch !== (line.batchNo ?? "")) {
        line.batchNo = nextBatch;
        changed = true;
      }
      for (const comp of line.componentBatches ?? []) {
        const nextComp = replaceBatchNoIfMatch(comp.batchNo, oldBatchNo, newBatchNo);
        if (nextComp !== (comp.batchNo ?? "")) {
          comp.batchNo = nextComp;
          changed = true;
        }
      }
    }

    for (const def of order.batchDefs ?? []) {
      const nextDef = replaceBatchNoIfMatch(def.batchNo, oldBatchNo, newBatchNo);
      if (nextDef !== (def.batchNo ?? "")) {
        def.batchNo = nextDef;
        changed = true;
      }
    }

    for (const item of order.subtractedItems ?? []) {
      const nextItem = replaceBatchNoIfMatch(item.batchNo, oldBatchNo, newBatchNo);
      if (nextItem !== (item.batchNo ?? "")) {
        item.batchNo = nextItem;
        changed = true;
      }
    }

    if (changed) {
      order.markModified("sheetLines");
      order.markModified("batchDefs");
      order.markModified("subtractedItems");
      await order.save();
    }
  }

  for (const lot of lotsToRename) {
    lot.batchNo = newBatchNo;
    await lot.save();
  }

  const oldKeys = new Set([oldBatchNo, normalizeBatchNo(oldBatchNo)]);
  await ReadyBottleMovement.updateMany(
    { batchNo: { $in: [...oldKeys] } },
    { $set: { batchNo: newBatchNo } },
  );

  await BatchFillingDailyEntry.updateMany(
    { batchNo: { $in: [...oldKeys] } },
    { $set: { batchNo: newBatchNo } },
  );

  const updated = await ProductionBatch.findByIdAndUpdate(
    batchId,
    { $set: { batchNo: newBatchNo } },
    { new: true },
  );
  if (!updated) {
    return { ok: false, error: "Batch not found." };
  }

  return { ok: true, newBatchNo };
}

export function patchTouchesLockedFields(body: Record<string, unknown>): boolean {
  const keys = [
    "productName",
    "totalLiters",
    "ph",
    "solids",
    "appearance",
    "provider",
    "hcl",
    "viscosity",
    "quantity",
    "preparedAt",
    "drum",
    "customer",
    "qcOutcome",
    "qcComment",
    "batchKind",
  ];
  return keys.some((k) => body[k] !== undefined);
}
