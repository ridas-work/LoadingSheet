import type { PackagingItemDoc } from "@/lib/models/PackagingItem";
import type { PackagingStockMovementDoc } from "@/lib/models/PackagingStockMovement";
import { CATEGORY_LABELS } from "@/lib/packagingInventory";

export type PackagingHistoryEntry = {
  date: string;
  itemCode: string;
  itemName: string;
  category: string;
  categoryLabel: string;
  unit: string;
  balance: number;
  change: number;
  reason: string;
  recordedByName: string;
  note: string;
};

export type PackagingDailySnapshot = {
  date: string;
  itemCode: string;
  itemName: string;
  category: string;
  categoryLabel: string;
  unit: string;
  balance: number;
};

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseHistoryDate(value: string): Date | null {
  const m = value.trim().match(DATE_ONLY_RE);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function enumerateDateKeys(from: string, to: string): string[] {
  const start = parseHistoryDate(from);
  const end = parseHistoryDate(to);
  if (!start || !end || start > end) return [];

  const keys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function endOfLocalDay(dateKey: string): Date {
  const dt = parseHistoryDate(dateKey);
  if (!dt) return new Date();
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
}

type MovementLike = Pick<
  PackagingStockMovementDoc,
  "itemCode" | "quantityDelta" | "quantityAfter" | "reason" | "note" | "recordedByName" | "createdAt"
>;

type ItemLike = Pick<PackagingItemDoc, "code" | "name" | "category" | "unit">;

/** Days where stock changed — one row per item per day with end-of-day balance. */
export function buildPackagingChangeHistory(
  items: ItemLike[],
  movements: MovementLike[],
  from: string,
  to: string,
): PackagingHistoryEntry[] {
  const fromDt = parseHistoryDate(from);
  const toEnd = endOfLocalDay(to);
  if (!fromDt || !toEnd) return [];

  const itemByCode = new Map(items.map((item) => [item.code, item]));
  const grouped = new Map<string, MovementLike[]>();

  for (const movement of movements) {
    if (!movement.createdAt) continue;
    const created = new Date(movement.createdAt);
    if (created < fromDt || created > toEnd) continue;
    const item = itemByCode.get(movement.itemCode);
    if (!item) continue;
    const arr = grouped.get(movement.itemCode) ?? [];
    arr.push(movement);
    grouped.set(movement.itemCode, arr);
  }

  const entries: PackagingHistoryEntry[] = [];

  for (const [itemCode, itemMovements] of grouped) {
    const item = itemByCode.get(itemCode)!;
    const byDay = new Map<string, MovementLike[]>();
    for (const movement of itemMovements) {
      const key = toDateKey(new Date(movement.createdAt!));
      const dayRows = byDay.get(key) ?? [];
      dayRows.push(movement);
      byDay.set(key, dayRows);
    }

    for (const [date, dayMovements] of byDay) {
      dayMovements.sort(
        (a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime(),
      );
      const last = dayMovements[dayMovements.length - 1]!;
      const change = dayMovements.reduce((sum, row) => sum + row.quantityDelta, 0);
      const reasons = [...new Set(dayMovements.map((row) => row.reason).filter(Boolean))];
      const category = item.category ?? "other";

      entries.push({
        date,
        itemCode,
        itemName: item.name,
        category,
        categoryLabel: CATEGORY_LABELS[category] ?? category,
        unit: item.unit ?? "pcs",
        balance: last.quantityAfter,
        change,
        reason: reasons.join(", "),
        recordedByName: last.recordedByName ?? "",
        note: dayMovements.map((row) => row.note?.trim()).filter(Boolean).join(" · "),
      });
    }
  }

  entries.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.itemName.localeCompare(b.itemName);
  });

  return entries;
}

/** End-of-day balance for every day in range (for one item or all). */
export function buildPackagingDailySnapshots(
  items: ItemLike[],
  movements: MovementLike[],
  from: string,
  to: string,
): PackagingDailySnapshot[] {
  const dates = enumerateDateKeys(from, to);
  if (dates.length === 0) return [];

  const itemByCode = new Map(items.map((item) => [item.code, item]));
  const movementsByItem = new Map<string, MovementLike[]>();
  for (const movement of movements) {
    if (!movement.createdAt || !itemByCode.has(movement.itemCode)) continue;
    const arr = movementsByItem.get(movement.itemCode) ?? [];
    arr.push(movement);
    movementsByItem.set(movement.itemCode, arr);
  }

  for (const arr of movementsByItem.values()) {
    arr.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  const snapshots: PackagingDailySnapshot[] = [];

  for (const item of items) {
    const itemMovements = movementsByItem.get(item.code) ?? [];
    let cursor = 0;
    let lastBalance = 0;

    for (const date of dates) {
      const end = endOfLocalDay(date);
      while (cursor < itemMovements.length && new Date(itemMovements[cursor]!.createdAt!) <= end) {
        lastBalance = itemMovements[cursor]!.quantityAfter;
        cursor += 1;
      }

      if (lastBalance === 0 && cursor === 0) continue;

      const category = item.category ?? "other";
      snapshots.push({
        date,
        itemCode: item.code,
        itemName: item.name,
        category,
        categoryLabel: CATEGORY_LABELS[category] ?? category,
        unit: item.unit ?? "pcs",
        balance: lastBalance,
      });
    }
  }

  snapshots.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.itemName.localeCompare(b.itemName);
  });

  return snapshots;
}
