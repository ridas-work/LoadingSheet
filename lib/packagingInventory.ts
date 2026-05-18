import type { PackagingItemDoc } from "@/lib/models/PackagingItem";

export function canViewPackagingInventory(role: string | null): boolean {
  return role === "dispatch_editor" || role === "admin";
}

export function serializePackagingItem(item: PackagingItemDoc | Record<string, unknown>) {
  const doc = item as PackagingItemDoc;
  return {
    code: doc.code,
    name: doc.name,
    category: doc.category,
    unit: doc.unit ?? "pcs",
    onHand: doc.onHand ?? 0,
    linkedProductCode: doc.linkedProductCode ?? "",
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
  other: "Other",
};
