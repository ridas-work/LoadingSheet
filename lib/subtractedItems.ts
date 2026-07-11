import type { SheetLine } from "@/lib/buildSheetLines";
import type { CustomCartonDef } from "@/lib/hybridSheetLines";
import { isMixedSampleLine } from "@/lib/mixedSampleBox";

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

export type SubtractionFromEdit = {
  standardItems: OrderItemLike[];
  customCartons: CustomCartonDef[];
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

function mixedLineKey(line: SheetLine): string {
  const mc = (line.mixedContents ?? [])
    .map((c) => {
      const extra = c as { bottleSizeCode?: string; packingCode?: string };
      return `${c.productName.trim().toLowerCase()}:${c.bottles}:${(extra.bottleSizeCode ?? "").toLowerCase()}:${(extra.packingCode ?? "").toLowerCase()}`;
    })
    .sort()
    .join("|");
  const box = (line.customBoxCode ?? "").trim().toLowerCase();
  const label = line.productName.trim().toLowerCase();
  return `mixed:${box}:${label}:${mc}`;
}

type StandardLineCount = {
  productName: string;
  bottlesPerBox: number;
  count: number;
};

type MixedLineBucket = {
  productName: string;
  customBoxCode?: string;
  contents: CustomCartonDef["contents"];
  count: number;
};

function countStandardSheetLines(lines: SheetLine[], map: Map<string, StandardLineCount>) {
  for (const line of lines) {
    if (isMixedSampleLine(line)) continue;
    const key = productKey(line.productName, line.bottlesPerBox);
    const prev = map.get(key);
    if (prev) prev.count += 1;
    else {
      map.set(key, {
        productName: line.productName.trim(),
        bottlesPerBox: line.bottlesPerBox,
        count: 1,
      });
    }
  }
}

function countMixedSheetLines(lines: SheetLine[], map: Map<string, MixedLineBucket>) {
  for (const line of lines) {
    if (!isMixedSampleLine(line)) continue;
    const key = mixedLineKey(line);
    const prev = map.get(key);
    if (prev) {
      prev.count += 1;
      continue;
    }
    map.set(key, {
      productName: line.productName,
      customBoxCode: line.customBoxCode,
      contents: (line.mixedContents ?? []).map((c) => {
        const extra = c as { bottleSizeCode?: string; packingCode?: string };
        return {
          productName: c.productName,
          bottles: c.bottles,
          ...(extra.bottleSizeCode?.trim()
            ? { bottleSizeCode: extra.bottleSizeCode.trim().toLowerCase() }
            : {}),
          ...(extra.packingCode?.trim() ? { packingCode: extra.packingCode.trim().toLowerCase() } : {}),
        };
      }),
      count: 1,
    });
  }
}

/** Compare loading-sheet rows before/after boss edit — catches standard lines and custom cartons. */
export function computeSheetLineSubtractions(
  beforeLines: SheetLine[],
  afterLines: SheetLine[],
): SubtractionFromEdit {
  const beforeStd = new Map<string, StandardLineCount>();
  const afterStd = new Map<string, StandardLineCount>();
  const beforeMix = new Map<string, MixedLineBucket>();
  const afterMix = new Map<string, MixedLineBucket>();

  countStandardSheetLines(beforeLines, beforeStd);
  countStandardSheetLines(afterLines, afterStd);
  countMixedSheetLines(beforeLines, beforeMix);
  countMixedSheetLines(afterLines, afterMix);

  const standardItems: OrderItemLike[] = [];
  for (const [, old] of beforeStd) {
    const key = productKey(old.productName, old.bottlesPerBox);
    const next = afterStd.get(key)?.count ?? 0;
    if (old.count > next) {
      standardItems.push({
        productName: old.productName,
        boxes: old.count - next,
        bottlesPerBox: old.bottlesPerBox,
      });
    }
  }

  const customCartons: CustomCartonDef[] = [];
  for (const [, old] of beforeMix) {
    const key = mixedLineKey({
      productName: old.productName,
      bottlesPerBox: 0,
      boxNo: 0,
      batchNo: "",
      weight: null,
      mixedContents: old.contents,
      customBoxCode: old.customBoxCode,
      lineKind: "mixed_sample",
    });
    const next = afterMix.get(key)?.count ?? 0;
    if (old.count > next) {
      customCartons.push({
        boxCount: old.count - next,
        contents: old.contents,
        ...(old.customBoxCode ? { customBoxCode: old.customBoxCode } : {}),
      });
    }
  }

  return { standardItems, customCartons };
}

export function hasSubtractionFromEdit(sub: SubtractionFromEdit): boolean {
  return (
    sub.standardItems.some((i) => i.boxes > 0) || sub.customCartons.some((c) => c.boxCount > 0)
  );
}

function mergeStandardSubtractionItem(
  items: OrderItemLike[],
  delta: { productName: string; boxes: number; bottlesPerBox: number },
) {
  if (delta.boxes <= 0) return;
  const key = productKey(delta.productName, delta.bottlesPerBox);
  const existing = items.find((i) => productKey(i.productName, i.bottlesPerBox) === key);
  if (existing) existing.boxes += delta.boxes;
  else items.push({ ...delta });
}

/** Boss edit subtractions — sheet rows plus mixed-sample bottle grid when applicable. */
export function computeBossEditSubtractions(input: {
  oldKind: string | null | undefined;
  nextKind: string | null | undefined;
  beforeLines: SheetLine[];
  afterLines: SheetLine[];
  beforeMixedContents: MixedContentLike[];
  afterMixedContents: MixedContentLike[];
}): SubtractionFromEdit {
  if (input.oldKind === "mixed_sample" && input.nextKind !== "mixed_sample") {
    return { standardItems: [], customCartons: [] };
  }
  if (input.oldKind !== "mixed_sample" && input.nextKind === "mixed_sample") {
    return { standardItems: [], customCartons: [] };
  }

  const subtraction = computeSheetLineSubtractions(input.beforeLines, input.afterLines);

  if (input.oldKind === "mixed_sample" && input.nextKind === "mixed_sample") {
    for (const delta of computeMixedContentSubtractions(
      input.beforeMixedContents,
      input.afterMixedContents,
    )) {
      mergeStandardSubtractionItem(subtraction.standardItems, delta);
    }
  }

  return subtraction;
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
