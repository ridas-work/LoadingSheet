import mongoose from "mongoose";

import { Order } from "@/lib/models/Order";
import type { DispatchTripDoc } from "@/lib/models/DispatchTrip";
import { FIELD_SAMPLE_ORDER_KIND } from "@/lib/sampleDispatch";

export type TripOrderChallanInput = {
  orderId: string;
  dcNo: string;
};

type TripWithOrderChallans = DispatchTripDoc & {
  orderChallans?: Array<{
    orderId?: mongoose.Types.ObjectId | string | null;
    dcNo?: string | null;
  }>;
};

function dispatchFromTrip(trip: DispatchTripDoc, dcNo?: string) {
  const driverName = trip.driverName ?? "";
  return {
    vehicleNo: trip.vehicleNo ?? "",
    driverName,
    dcNo: dcNo ?? trip.dcNo ?? "",
    helperName: trip.helperName ?? "",
    productionIncharge: trip.productionIncharge ?? "",
    securityName: trip.securityName ?? "",
    driverSignature: trip.driverSignature?.trim() || driverName,
  };
}

function orderChallanMap(trip: TripWithOrderChallans): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of trip.orderChallans ?? []) {
    const orderId = row.orderId?.toString().trim();
    if (!orderId) continue;
    map.set(orderId, row.dcNo?.trim() ?? "");
  }
  return map;
}

export async function syncTripDispatchToOrders(
  trip: DispatchTripDoc,
  attribution?: { userId: string; userName: string },
) {
  const challanByOrderId = orderChallanMap(trip as TripWithOrderChallans);
  const now = new Date();

  for (const orderId of trip.orderIds ?? []) {
    const dispatch = dispatchFromTrip(trip, challanByOrderId.get(orderId.toString()));
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

/** When a trip is discarded, release Esha batch liters by clearing Rashid's sheet assignments. */
export async function releaseBatchAssignmentsOnTripDiscard(
  orderIds: mongoose.Types.ObjectId[],
): Promise<void> {
  if (orderIds.length === 0) return;

  const orders = await Order.find({ _id: { $in: orderIds } });
  for (const order of orders) {
    if (order.orderKind === FIELD_SAMPLE_ORDER_KIND) continue;

    let changed = false;
    for (const line of order.sheetLines ?? []) {
      if ((line.batchNo ?? "").trim() || (line.componentBatches ?? []).length > 0) {
        line.set("batchNo", "");
        line.set("componentBatches", []);
        changed = true;
      }
    }
    if (order.weightsVerifiedAt) {
      order.weightsVerifiedAt = null;
      changed = true;
    }
    if (changed) {
      order.markModified("sheetLines");
      await order.save();
    }
  }
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

export function parseTripKind(raw: unknown): "regular" | "sample" {
  return raw === "sample" ? "sample" : "regular";
}

/** Sample trips carry only field sample orders; regular trips carry no field samples. */
export async function assertOrdersMatchTripKind(
  orderIds: string[],
  tripKind: "regular" | "sample",
): Promise<string | null> {
  const objectIds = orderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (objectIds.length === 0) return null;

  const orders = await Order.find({ _id: { $in: objectIds } })
    .select({ poNumber: 1, orderKind: 1 })
    .lean();

  for (const o of orders) {
    const isSample = o.orderKind === "field_sample";
    if (tripKind === "sample" && !isSample) {
      return `PO ${o.poNumber} is a regular order and cannot go on a sample trip.`;
    }
    if (tripKind === "regular" && isSample) {
      return `${o.poNumber} is a sample order — use a sample trip for it.`;
    }
  }
  return null;
}

export function parseOrderIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => id.length > 0);
}

export function normalizeOrderChallans(
  raw: unknown,
  orderIds: string[],
  existing: unknown,
  fallbackDcNo: string,
): TripOrderChallanInput[] {
  const nextMap = new Map<string, string>();
  const existingMap = new Map<string, string>();

  if (Array.isArray(existing)) {
    for (const row of existing) {
      if (!row || typeof row !== "object") continue;
      const obj = row as { orderId?: unknown; dcNo?: unknown };
      const orderId =
        typeof obj.orderId === "string"
          ? obj.orderId.trim()
          : obj.orderId && typeof obj.orderId === "object" && "toString" in obj.orderId
            ? String(obj.orderId).trim()
            : "";
      if (orderId) existingMap.set(orderId, typeof obj.dcNo === "string" ? obj.dcNo.trim() : "");
    }
  }

  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const obj = row as { orderId?: unknown; dcNo?: unknown };
      const orderId = typeof obj.orderId === "string" ? obj.orderId.trim() : "";
      if (!orderId || !orderIds.includes(orderId)) continue;
      nextMap.set(orderId, typeof obj.dcNo === "string" ? obj.dcNo.trim() : "");
    }
  }

  return orderIds.map((orderId) => ({
    orderId,
    dcNo: nextMap.get(orderId) ?? existingMap.get(orderId) ?? fallbackDcNo,
  }));
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
