import type { SheetLine } from "@/lib/buildSheetLines";

export const SUBTRACTED_ITEM_STATUSES = ["pending", "carried_out", "discarded"] as const;
export type SubtractedItemStatus = (typeof SUBTRACTED_ITEM_STATUSES)[number];

export type SubtractedItemRecord = {
  _id?: string;
  productName: string;
  boxes: number;
  bottlesPerBox: number;
  status: SubtractedItemStatus;
  subtractedAt: Date | string;
  subtractedByName: string;
  batchNo?: string;
  carriedOutAt?: Date | string | null;
  discardedAt?: Date | string | null;
  discardedByName?: string;
};

export type OrderItemLike = {
  productName: string;
  boxes: number;
  bottlesPerBox: number;
};

export type MixedContentLike = {
  productName: string;
  bottles: number;
};

function productKey(productName: string, bottlesPerBox: number): string {
  return `${productName.trim().toLowerCase()}|${bottlesPerBox}`;
}

function aggregateStandardItems(items: OrderItemLike[]): Map<string, OrderItemLike> {
  const map = new Map<string, OrderItemLike>();
  for (const it of items) {
    const key = productKey(it.productName, it.bottlesPerBox);
    const prev = map.get(key);
    if (prev) {
      prev.boxes += it.boxes;
    } else {
      map.set(key, { ...it, productName: it.productName.trim(), boxes: it.boxes });
    }
  }
  return map;
}

function aggregateMixedBottles(
  contents: MixedContentLike[],
): Map<string, { productName: string; bottles: number }> {
  const map = new Map<string, { productName: string; bottles: number }>();
  for (const c of contents) {
    const name = c.productName.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const prev = map.get(key);
    if (prev) prev.bottles += c.bottles;
    else map.set(key, { productName: name, bottles: c.bottles });
  }
  return map;
}

type LineWithBatches = SheetLine & {
  batchNo?: string;
};

function lineIdentity(line: LineWithBatches): string {
  if (line.lineKind === "mixed_sample") {
    const mc = (line.mixedContents ?? [])
      .map((c) => `${c.productName.trim().toLowerCase()}:${c.bottles}`)
      .sort()
      .join("|");
    return `mixed:${line.boxNo}:${mc}`;
  }
  return `std:${line.boxNo}:${line.productName.trim().toLowerCase()}:${line.bottlesPerBox}`;
}

/** Best-effort batch label from sheet lines that were removed on edit. */
export function batchHintsFromRemovedLines(
  oldLines: LineWithBatches[],
  newLines: LineWithBatches[],
): Map<string, string> {
  const newKeys = new Set(newLines.map(lineIdentity));
  const hints = new Map<string, string>();
  for (const line of oldLines) {
    if (newKeys.has(lineIdentity(line))) continue;
    const key = line.productName.trim().toLowerCase();
    const batch = line.batchNo?.trim();
    if (batch && !hints.has(key)) hints.set(key, batch);
  }
  return hints;
}

export function computeStandardItemSubtractions(
  before: OrderItemLike[],
  after: OrderItemLike[],
): Array<{ productName: string; boxes: number; bottlesPerBox: number }> {
  const oldMap = aggregateStandardItems(before);
  const newMap = aggregateStandardItems(after);
  const out: Array<{ productName: string; boxes: number; bottlesPerBox: number }> = [];

  for (const [, old] of oldMap) {
    const key = productKey(old.productName, old.bottlesPerBox);
    const nextBoxes = newMap.get(key)?.boxes ?? 0;
    if (old.boxes > nextBoxes) {
      out.push({
        productName: old.productName,
        boxes: old.boxes - nextBoxes,
        bottlesPerBox: old.bottlesPerBox,
      });
    }
  }
  return out;
}

export function computeMixedContentSubtractions(
  before: MixedContentLike[],
  after: MixedContentLike[],
): Array<{ productName: string; boxes: number; bottlesPerBox: number }> {
  const oldMap = aggregateMixedBottles(before);
  const newMap = aggregateMixedBottles(after);
  const out: Array<{ productName: string; boxes: number; bottlesPerBox: number }> = [];

  for (const [, old] of oldMap) {
    const key = old.productName.toLowerCase();
    const nextBottles = newMap.get(key)?.bottles ?? 0;
    if (old.bottles > nextBottles) {
      out.push({
        productName: old.productName,
        boxes: old.bottles - nextBottles,
        bottlesPerBox: 1,
      });
    }
  }
  return out;
}

export function buildNewSubtractedItems(
  deltas: Array<{ productName: string; boxes: number; bottlesPerBox: number }>,
  batchHints: Map<string, string>,
  subtractedByName: string,
): SubtractedItemRecord[] {
  const now = new Date();
  return deltas
    .filter((d) => d.boxes > 0)
    .map((d) => ({
      productName: d.productName,
      boxes: d.boxes,
      bottlesPerBox: d.bottlesPerBox,
      status: "pending" as const,
      subtractedAt: now,
      subtractedByName,
      batchNo: batchHints.get(d.productName.trim().toLowerCase()) ?? "",
    }));
}

export function pendingSubtractionCount(items: SubtractedItemRecord[] | null | undefined): number {
  return (items ?? []).filter((i) => i.status === "pending").length;
}

export function sortSubtractedItems(items: SubtractedItemRecord[]): SubtractedItemRecord[] {
  const order: Record<SubtractedItemStatus, number> = {
    pending: 0,
    carried_out: 1,
    discarded: 2,
  };
  return [...items].sort((a, b) => {
    const sa = order[a.status] ?? 9;
    const sb = order[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    return new Date(b.subtractedAt).getTime() - new Date(a.subtractedAt).getTime();
  });
}

export const SUBTRACTED_STATUS_LABELS: Record<SubtractedItemStatus, string> = {
  pending: "Pending — will be sent soon",
  carried_out: "Carried out",
  discarded: "Discarded",
};
