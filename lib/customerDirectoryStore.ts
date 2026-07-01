import { CustomerDirectory } from "@/lib/models/CustomerDirectory";

export type CustomerDirectoryEntry = { code: string; name: string };

export function slugFromCustomerName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `cust-${slug}`;
}

export function normalizeCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function serializeCustomerDirectory(doc: {
  code: string;
  name: string;
}): CustomerDirectoryEntry {
  return { code: doc.code, name: doc.name.trim() };
}

export async function listCustomerDirectory(): Promise<CustomerDirectoryEntry[]> {
  const rows = await CustomerDirectory.find({ active: true }).sort({ name: 1 }).lean();
  return rows.map((r) => serializeCustomerDirectory(r));
}

export async function upsertCustomerDirectory(
  name: string,
  actor?: { userId?: string; name?: string },
): Promise<CustomerDirectoryEntry | { error: string }> {
  const normalized = normalizeCustomerName(name);
  if (!normalized) return { error: "Customer name is required." };
  if (normalized.length > 160) return { error: "Customer name is too long (max 160 characters)." };

  const existingByName = await CustomerDirectory.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  }).lean();

  if (existingByName) {
    if (!existingByName.active) {
      await CustomerDirectory.updateOne(
        { _id: existingByName._id },
        { $set: { active: true, name: normalized } },
      );
    }
    return serializeCustomerDirectory({ code: existingByName.code, name: normalized });
  }

  const code = slugFromCustomerName(normalized);
  const existingByCode = await CustomerDirectory.findOne({ code }).lean();
  if (existingByCode) {
    return serializeCustomerDirectory({ code: existingByCode.code, name: existingByCode.name });
  }

  await CustomerDirectory.create({
    code,
    name: normalized,
    active: true,
    addedByUserId: actor?.userId ?? null,
    addedByName: actor?.name ?? "",
  });

  return serializeCustomerDirectory({ code, name: normalized });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
