import { rashidActiveOrdersMongoFilter } from "@/lib/gateDelivery";

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Awaiting Waleed approval",
  approved: "Approved",
  rejected: "Rejected",
};

export function isApprovalStatus(v: unknown): v is ApprovalStatus {
  return typeof v === "string" && APPROVAL_STATUSES.includes(v as ApprovalStatus);
}

export function normalizeApprovalStatus(v: unknown): ApprovalStatus {
  if (v === "pending" || v === "rejected") return v;
  return "approved";
}

/** Legacy orders without the field count as approved. */
export function isOrderApprovedForDispatch(order: { approvalStatus?: unknown }): boolean {
  const s = order.approvalStatus;
  if (s === undefined || s === null || s === "") return true;
  return normalizeApprovalStatus(s) === "approved";
}

export function initialApprovalStatusForPoCreator(): ApprovalStatus {
  return "pending";
}

/** POs Waleed can release to Ali / Rashid. */
export function approvedOrdersMongoFilter() {
  return {
    $or: [
      { approvalStatus: "approved" as const },
      { approvalStatus: { $exists: false } },
      { approvalStatus: null },
    ],
  };
}

export function pendingApprovalMongoFilter() {
  return { approvalStatus: "pending" as const, discardedAt: null };
}

/** One row per PO number — keep the newest pending submission if duplicates exist. */
export function dedupePendingApprovalsByPoNumber<
  T extends { poNumber: string; createdAt?: Date | string | null },
>(orders: T[]): T[] {
  const byPo = new Map<string, T>();
  for (const order of orders) {
    const key = order.poNumber.trim().toLowerCase();
    if (!key) continue;
    const prev = byPo.get(key);
    if (!prev) {
      byPo.set(key, order);
      continue;
    }
    const prevAt = prev.createdAt ? new Date(prev.createdAt).getTime() : 0;
    const nextAt = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    if (nextAt >= prevAt) byPo.set(key, order);
  }
  return [...byPo.values()];
}

/** Human label for PO type on Waleed sample-approval screen. */
export function orderRequestTypeLabel(orderKind?: string | null): string {
  if (orderKind === "mixed_sample") return "Mixed sample box";
  if (orderKind === "hybrid") return "Standard + custom cartons";
  return "Standard order";
}

export function isSampleStyleOrder(orderKind?: string | null): boolean {
  return orderKind === "mixed_sample" || orderKind === "hybrid";
}

/** Ali trip planner — active gate + approved only. */
export function tripPlannerOrdersMongoFilter() {
  return {
    $and: [rashidActiveOrdersMongoFilter(), approvedOrdersMongoFilter()],
  };
}

/** Rashid batch/dispatch — same eligibility as trip planner for new PO picks. */
export function dispatchEligibleOrdersMongoFilter() {
  return tripPlannerOrdersMongoFilter();
}
