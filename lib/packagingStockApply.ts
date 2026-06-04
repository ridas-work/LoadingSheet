import { packagingBalance, type PackagingQtyFields } from "@/lib/packagingInventory";
import { PackagingItem } from "@/lib/models/PackagingItem";
import {
  PackagingStockMovement,
  type PackagingStockMovementDoc,
} from "@/lib/models/PackagingStockMovement";

type MovementReason = PackagingStockMovementDoc["reason"];

export type UipIncrementLine = {
  itemCode: string;
  quantity: number;
  detail: string;
};

/** Apply UIP increments (positive or negative). Returns error message or null on success. */
export async function applyPackagingUipIncrements(
  lines: UipIncrementLine[],
  meta: {
    reason: MovementReason;
    note: string;
    recordedByUserId: string;
    recordedByName: string;
  },
): Promise<string | null> {
  const grouped = new Map<string, { quantity: number; details: string[] }>();
  for (const line of lines) {
    if (!line.itemCode || line.quantity === 0) continue;
    const g = grouped.get(line.itemCode) ?? { quantity: 0, details: [] };
    g.quantity += line.quantity;
    g.details.push(line.detail);
    grouped.set(line.itemCode, g);
  }

  if (grouped.size === 0) return null;

  const codes = [...grouped.keys()];
  const items = await PackagingItem.find({ code: { $in: codes }, active: true });
  const byCode = new Map(items.map((i) => [i.code, i]));

  const insufficient: string[] = [];
  for (const [code, { quantity }] of grouped) {
    const item = byCode.get(code);
    if (!item) {
      insufficient.push(`Packaging item "${code}" not found`);
      continue;
    }
    const before = packagingBalance(item as PackagingQtyFields);
    if (quantity > 0 && before < quantity) {
      insufficient.push(
        `Insufficient ${item.name}: need ${quantity}, balance ${before} (Purchased − Rejected − UIP)`,
      );
    }
  }
  if (insufficient.length > 0) return insufficient.join("; ");

  for (const [code, { quantity, details }] of grouped) {
    const item = byCode.get(code)!;
    const before = packagingBalance(item);
    item.uip = (item.uip ?? 0) + quantity;
    const after = packagingBalance(item);
    item.onHand = after;
    await item.save();

    await PackagingStockMovement.create({
      itemCode: code,
      quantityDelta: after - before,
      quantityAfter: after,
      reason: meta.reason,
      note: `${meta.note}${details.length ? `: ${details.join("; ")}` : ""}`,
      recordedByUserId: meta.recordedByUserId,
      recordedByName: meta.recordedByName,
    });
  }

  return null;
}
