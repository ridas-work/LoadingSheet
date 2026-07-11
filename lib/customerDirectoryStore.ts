import { CustomerAccount } from "@/lib/models/CustomerAccount";
import { CustomerDirectory } from "@/lib/models/CustomerDirectory";

export type CustomerDirectoryEntry = { code: string; name: string; city?: string };

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

function approvedAccountsMongoFilter(): Record<string, unknown> {
  return {
    $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }],
    active: true,
    directoryCode: { $ne: "" },
  };
}

export async function listCustomerDirectory(): Promise<CustomerDirectoryEntry[]> {
  const approvedAccounts = await CustomerAccount.find(approvedAccountsMongoFilter())
    .select({ directoryCode: 1, city: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .lean();

  const approvedCodes = [
    ...new Set(
      approvedAccounts
        .map((row) => (row.directoryCode ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (approvedCodes.length === 0) return [];

  const rows = await CustomerDirectory.find({ active: true, code: { $in: approvedCodes } })
    .sort({ name: 1 })
    .lean();

  const cityByCode = new Map<string, string>();
  for (const acc of approvedAccounts) {
    const code = (acc.directoryCode ?? "").trim().toLowerCase();
    const city = (acc.city ?? "").trim();
    if (code && city && !cityByCode.has(code)) cityByCode.set(code, city);
  }

  return rows.map((r) => {
    const entry = serializeCustomerDirectory(r);
    const city = cityByCode.get(r.code);
    return city ? { ...entry, city } : entry;
  });
}

/** Create or link a directory row for account opening — not visible in pickers until approved. */
export async function ensureCustomerDirectoryForAccount(
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
    active: false,
    addedByUserId: actor?.userId ?? null,
    addedByName: actor?.name ?? "",
  });

  return serializeCustomerDirectory({ code, name: normalized });
}

export async function setCustomerDirectoryActiveForCode(
  code: string,
  active: boolean,
): Promise<void> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return;
  await CustomerDirectory.updateOne({ code: normalized }, { $set: { active } });
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
        { $set: { name: normalized } },
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
