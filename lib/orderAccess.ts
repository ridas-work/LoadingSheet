import { notDiscardedOrdersMongoFilter } from "@/lib/orderDiscard";
import type { AppRole } from "@/lib/roles";
import { isAdmin } from "@/lib/roles";

export type OrderOwnerFields = {
  createdByUserId?: string | null;
};

export function isOrderOwner(
  order: OrderOwnerFields,
  userId: string | undefined | null,
): boolean {
  if (!userId) return false;
  return order.createdByUserId === userId;
}

/** PO creators see only orders they entered. */
export function poCreatorOrdersMongoFilter(userId: string): Record<string, unknown> {
  return {
    ...notDiscardedOrdersMongoFilter(),
    createdByUserId: userId,
  };
}

export function canViewOrderAsPoCreator(
  role: AppRole | null,
  userId: string | undefined | null,
  order: OrderOwnerFields,
): boolean {
  if (role !== "po_creator") return false;
  return isOrderOwner(order, userId);
}

/** Admin edits any order; PO creators edit only their own. */
export function canEditOwnOrder(
  role: AppRole | null,
  userId: string | undefined | null,
  order: OrderOwnerFields,
): boolean {
  if (isAdmin(role)) return true;
  if (role !== "po_creator" || !userId) return false;
  return isOrderOwner(order, userId);
}
