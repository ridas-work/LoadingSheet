import { normalizeCustomerName } from "@/lib/customerDirectoryStore";
import { CustomerAccount } from "@/lib/models/CustomerAccount";
import { CustomerDirectory } from "@/lib/models/CustomerDirectory";

export const CUSTOMER_APPROVAL_STATUSES = ["pending", "approved", "blocked"] as const;
export type CustomerApprovalStatus = (typeof CUSTOMER_APPROVAL_STATUSES)[number];

export function normalizeCustomerApprovalStatus(value: unknown): CustomerApprovalStatus {
  if (value === "pending" || value === "blocked" || value === "approved") return value;
  return "approved";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Mongo filter excluding orders whose customerName matches any blocked name (case-insensitive). */
export function excludeBlockedCustomerNamesFilter(names: string[]): Record<string, unknown> {
  const unique = [
    ...new Set(names.map((n) => normalizeCustomerName(n)).filter(Boolean)),
  ];
  if (unique.length === 0) return {};
  return {
    $nor: unique.map((name) => ({
      customerName: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
    })),
  };
}

export async function getBlockedCustomerNames(): Promise<string[]> {
  const accounts = await CustomerAccount.find({ approvalStatus: "blocked" })
    .select({ companyName: 1, directoryCode: 1 })
    .lean();
  const names = new Set<string>();
  for (const row of accounts) {
    const company = normalizeCustomerName(row.companyName ?? "");
    if (company) names.add(company);
  }
  const codes = accounts
    .map((row) => (row.directoryCode ?? "").trim().toLowerCase())
    .filter(Boolean);
  if (codes.length > 0) {
    const directories = await CustomerDirectory.find({ code: { $in: codes } })
      .select({ name: 1 })
      .lean();
    for (const row of directories) {
      const name = normalizeCustomerName(row.name ?? "");
      if (name) names.add(name);
    }
  }
  return [...names];
}

export async function blockedCustomersOrderFilter(): Promise<Record<string, unknown>> {
  return excludeBlockedCustomerNamesFilter(await getBlockedCustomerNames());
}

export async function mergeOrderFilter(
  base: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const blocked = await blockedCustomersOrderFilter();
  if (Object.keys(blocked).length === 0) return base;
  return { $and: [base, blocked] };
}

export async function isCustomerNameBlocked(name: string): Promise<boolean> {
  const normalized = normalizeCustomerName(name);
  if (!normalized) return false;
  const blocked = await getBlockedCustomerNames();
  const key = normalized.toLowerCase();
  return blocked.some((n) => n.toLowerCase() === key);
}

export function approvedAccountsMongoFilter(): Record<string, unknown> {
  return {
    $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }],
    active: true,
    directoryCode: { $ne: "" },
  };
}

export async function validateApprovedCustomerName(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeCustomerName(name);
  if (!normalized) {
    return { ok: false, error: "Customer name is required." };
  }

  if (await isCustomerNameBlocked(normalized)) {
    return {
      ok: false,
      error: "This customer account is blocked and cannot be used.",
    };
  }

  const directory = await CustomerDirectory.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
    active: true,
  }).lean();

  if (!directory) {
    return {
      ok: false,
      error:
        "Pick a customer from the approved list. New accounts must be opened and approved by admin first.",
    };
  }

  const account = await CustomerAccount.findOne({
    directoryCode: directory.code,
    ...approvedAccountsMongoFilter(),
  }).lean();

  if (!account) {
    return {
      ok: false,
      error:
        "This customer is not approved yet. Ask admin to approve the account before creating orders or visits.",
    };
  }

  return { ok: true };
}
