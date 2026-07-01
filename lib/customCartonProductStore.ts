import type { CustomCartonCatalogProduct } from "@/components/CustomCartonBuilder";
import { CustomCartonProduct } from "@/lib/models/CustomCartonProduct";

export function slugFromCustomCartonName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `cc-${slug}`;
}

export function normalizeCustomCartonProductName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function serializeCustomCartonProduct(doc: {
  code: string;
  name: string;
}): CustomCartonCatalogProduct {
  return { code: doc.code, name: doc.name.trim() };
}

export async function listCustomCartonProducts(): Promise<CustomCartonCatalogProduct[]> {
  const rows = await CustomCartonProduct.find({ active: true }).sort({ name: 1 }).lean();
  return rows.map((r) => serializeCustomCartonProduct(r));
}

export async function upsertCustomCartonProduct(
  name: string,
  actor?: { userId?: string; name?: string },
): Promise<CustomCartonCatalogProduct | { error: string }> {
  const normalized = normalizeCustomCartonProductName(name);
  if (!normalized) return { error: "Product name is required." };
  if (normalized.length > 120) return { error: "Product name is too long (max 120 characters)." };

  const code = slugFromCustomCartonName(normalized);
  const key = normalized.toLowerCase();

  const existingByName = await CustomCartonProduct.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  }).lean();

  if (existingByName) {
    if (!existingByName.active) {
      await CustomCartonProduct.updateOne(
        { _id: existingByName._id },
        { $set: { active: true, name: normalized } },
      );
    }
    return serializeCustomCartonProduct({ code: existingByName.code, name: normalized });
  }

  const existingByCode = await CustomCartonProduct.findOne({ code }).lean();
  if (existingByCode) {
    return serializeCustomCartonProduct({ code: existingByCode.code, name: existingByCode.name });
  }

  await CustomCartonProduct.create({
    code,
    name: normalized,
    active: true,
    addedByUserId: actor?.userId ?? null,
    addedByName: actor?.name ?? "",
  });

  return serializeCustomCartonProduct({ code, name: normalized });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
