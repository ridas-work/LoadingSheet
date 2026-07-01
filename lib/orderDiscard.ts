import mongoose from "mongoose";

import { clearDispatchTripIdOnOrders } from "@/lib/dispatchTripSync";
import { normalizeGateStatus } from "@/lib/gateDelivery";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";

export function isOrderDiscarded(order: { discardedAt?: Date | string | null } | null | undefined): boolean {
  return order?.discardedAt != null;
}

/** Mongo filter — orders that are still active (not voided by admin). */
export function notDiscardedOrdersMongoFilter() {
  return { discardedAt: null };
}

const BLOCKED_GATE_STATUSES = new Set(["out_for_delivery", "delivered"]);

export function discardOrderBlockedReason(order: {
  discardedAt?: Date | string | null;
  gateDeliveryStatus?: unknown;
}): string | null {
  if (isOrderDiscarded(order)) {
    return "This order was already discarded.";
  }
  const gate = normalizeGateStatus(order.gateDeliveryStatus);
  if (BLOCKED_GATE_STATUSES.has(gate)) {
    return gate === "delivered"
      ? "Delivered orders cannot be discarded."
      : "Orders out for delivery cannot be discarded — mark pending redelivery at the gate first if the load returned.";
  }
  return null;
}

async function removeOrderFromDispatchTrip(orderId: mongoose.Types.ObjectId, tripId: mongoose.Types.ObjectId) {
  const trip = await DispatchTrip.findById(tripId);
  if (trip) {
    const idStr = orderId.toString();
    trip.orderIds = (trip.orderIds ?? []).filter((oid) => oid.toString() !== idStr);
    await trip.save();
  }
  await clearDispatchTripIdOnOrders([orderId]);
}

export async function discardOrder(
  orderId: string,
  audit: { userId: string; userName: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return { ok: false, error: "Invalid order id", status: 400 };
  }

  const oid = new mongoose.Types.ObjectId(orderId);
  const existing = await Order.findById(oid);
  if (!existing) {
    return { ok: false, error: "Not found", status: 404 };
  }

  const blockReason = discardOrderBlockedReason(existing);
  if (blockReason) {
    return { ok: false, error: blockReason, status: 400 };
  }

  if (existing.dispatchTripId) {
    await removeOrderFromDispatchTrip(oid, existing.dispatchTripId);
  }

  const now = new Date();
  existing.discardedAt = now;
  existing.discardedByUserId = audit.userId;
  existing.discardedByName = audit.userName;
  await existing.save();

  return { ok: true };
}
