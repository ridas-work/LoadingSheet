import type { PackagingItemDoc } from "@/lib/models/PackagingItem";
import {
  canEditPackagingInventory as roleCanEditPackagingInventory,
  canViewPackagingInventory as roleCanViewPackagingInventory,
  type AppRole,
} from "@/lib/roles";

export function canViewPackagingInventory(role: AppRole | null): boolean {
  return roleCanViewPackagingInventory(role);
}

export function canEditPackagingInventory(role: AppRole | null): boolean {
  return roleCanEditPackagingInventory(role);
}

export type PackagingQtyFields = {
  purchasedQty?: number;
  rejectedDamage?: number;
  uip?: number;
  onHand?: number;
};

/** Balance = purchased − rejected/damage − UIP (matches spreadsheet; Sales/Samples excluded). */
export function packagingBalance(item: PackagingQtyFields): number {
  const purchased = item.purchasedQty ?? 0;
  const rejected = item.rejectedDamage ?? 0;
  const uip = item.uip ?? 0;
  const hasLedger = purchased !== 0 || rejected !== 0 || uip !== 0;
  if (hasLedger) return purchased - rejected - uip;
  return item.onHand ?? 0;
}

function readQty(doc: PackagingItemDoc, key: "purchasedQty" | "rejectedDamage" | "uip"): number {
  const v = doc[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function serializePackagingItem(item: PackagingItemDoc | Record<string, unknown>) {
  const doc = item as PackagingItemDoc;
  let purchasedQty = readQty(doc, "purchasedQty");
  const rejectedDamage = readQty(doc, "rejectedDamage");
  const uip = readQty(doc, "uip");

  if (purchasedQty === 0 && rejectedDamage === 0 && uip === 0 && (doc.onHand ?? 0) > 0) {
    purchasedQty = doc.onHand ?? 0;
  }

  const row = {
    purchasedQty,
    rejectedDamage,
    uip,
    onHand: doc.onHand,
  };

  return {
    code: doc.code,
    name: doc.name,
    category: doc.category,
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : 9999,
    unit: doc.unit ?? "pcs",
    purchasedQty,
    rejectedDamage,
    uip,
    balance: packagingBalance(row),
    linkedProductCode: doc.linkedProductCode ?? "",
    linkedBatchFamily: doc.linkedBatchFamily ?? "",
    deductAs: doc.deductAs ?? doc.category ?? "other",
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : doc.updatedAt
          ? String(doc.updatedAt)
          : undefined,
  };
}

export const CATEGORY_LABELS: Record<string, string> = {
  bottle: "Bottles",
  cap: "Caps",
  sticker: "Stickers",
  label: "Labels",
  box: "Boxes",
  pouch: "Pouches",
  partition: "Partitions",
  other: "Other",
};

export const PACKAGING_CATEGORIES = [
  "bottle",
  "cap",
  "sticker",
  "label",
  "box",
  "pouch",
  "partition",
  "other",
] as const;

export type PackagingCategory = (typeof PACKAGING_CATEGORIES)[number];

export function isPackagingCategory(value: string): value is PackagingCategory {
  return (PACKAGING_CATEGORIES as readonly string[]).includes(value);
}

export function slugifyPackagingCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseNonNegativeInt(value: unknown, field: string): number | { error: string } {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return { error: `${field} must be a whole number ≥ 0` };
  }
  return n;
}
