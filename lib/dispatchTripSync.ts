import mongoose from "mongoose";

import { Order } from "@/lib/models/Order";
import type { DispatchTripDoc } from "@/lib/models/DispatchTrip";

function dispatchFromTrip(trip: DispatchTripDoc) {
  const driverName = trip.driverName ?? "";
  return {
    vehicleNo: trip.vehicleNo ?? "",
    driverName,
    dcNo: trip.dcNo ?? "",
    helperName: trip.helperName ?? "",
    productionIncharge: trip.productionIncharge ?? "",
    securityName: trip.securityName ?? "",
    driverSignature: trip.driverSignature?.trim() || driverName,
  };
}

export async function syncTripDispatchToOrders(
  trip: DispatchTripDoc,
  attribution?: { userId: string; userName: string },
) {
  const dispatch = dispatchFromTrip(trip);
  const now = new Date();

  for (const orderId of trip.orderIds ?? []) {
    await Order.findByIdAndUpdate(orderId, {
      dispatchTripId: trip._id,
      dispatch,
      ...(attribution
        ? {
            dispatchUpdatedByUserId: attribution.userId,
            dispatchUpdatedByName: attribution.userName,
            dispatchUpdatedAt: now,
          }
        : {}),
    });
  }
}

export async function clearDispatchTripIdOnOrders(orderIds: mongoose.Types.ObjectId[]) {
  if (orderIds.length === 0) return;
  await Order.updateMany({ _id: { $in: orderIds } }, { $set: { dispatchTripId: null } });
}

export async function assertOrdersAvailableForTrip(
  orderIds: string[],
  excludeTripId?: string,
): Promise<string | null> {
  if (orderIds.length === 0) {
    return "Select at least one order for this trip.";
  }

  const objectIds = orderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (objectIds.length !== orderIds.length) {
    return "One or more order ids are invalid.";
  }

  const conflicts = await Order.find({
    _id: { $in: objectIds },
    dispatchTripId: { $ne: null },
  })
    .select({ poNumber: 1, dispatchTripId: 1 })
    .lean();

  for (const c of conflicts) {
    const tripId = c.dispatchTripId?.toString();
    if (excludeTripId && tripId === excludeTripId) continue;
    return `PO ${c.poNumber} is already on another vehicle trip.`;
  }

  return null;
}

export function parseOrderIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => id.length > 0);
}

export function trimDispatchBody(body: Record<string, unknown>) {
  const trim = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const driverName = trim(body.driverName);
  return {
    vehicleNo: trim(body.vehicleNo),
    driverName,
    dcNo: trim(body.dcNo),
    helperName: trim(body.helperName),
    productionIncharge: trim(body.productionIncharge),
    securityName: trim(body.securityName),
    driverSignature: trim(body.driverSignature) || driverName,
  };
}
