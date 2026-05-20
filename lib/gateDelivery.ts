export const GATE_DELIVERY_STATUSES = [
  "none",
  "out_for_delivery",
  "delivered",
  "pending_redelivery",
] as const;

export type GateDeliveryStatus = (typeof GATE_DELIVERY_STATUSES)[number];

export const GATE_STATUS_LABELS: Record<GateDeliveryStatus, string> = {
  none: "At gate",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  pending_redelivery: "Pending redelivery",
};

const ALLOWED_TRANSITIONS: Record<GateDeliveryStatus, GateDeliveryStatus[]> = {
  none: ["out_for_delivery"],
  out_for_delivery: ["delivered", "pending_redelivery"],
  pending_redelivery: ["out_for_delivery"],
  delivered: [],
};

export function isGateDeliveryStatus(v: unknown): v is GateDeliveryStatus {
  return typeof v === "string" && GATE_DELIVERY_STATUSES.includes(v as GateDeliveryStatus);
}

export function assertGateTransition(from: GateDeliveryStatus, to: GateDeliveryStatus): string | null {
  if (from === to) return "Status is already set to that value";
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    return `Cannot change from "${GATE_STATUS_LABELS[from]}" to "${GATE_STATUS_LABELS[to]}"`;
  }
  return null;
}

export function parseGateDeliveryPatchBody(raw: unknown):
  | { ok: true; status: GateDeliveryStatus }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const status = (raw as { status?: unknown }).status;
  if (!isGateDeliveryStatus(status)) {
    return {
      ok: false,
      error: 'status must be "out_for_delivery", "delivered", or "pending_redelivery"',
    };
  }
  if (status === "none") {
    return { ok: false, error: "Cannot set status back to none from the gate screen" };
  }
  return { ok: true, status };
}

export function normalizeGateStatus(raw: unknown): GateDeliveryStatus {
  return isGateDeliveryStatus(raw) ? raw : "none";
}

export function gateDeliveryUpdateFields(
  to: GateDeliveryStatus,
  audit: { userId: string; userName: string },
): Record<string, unknown> {
  const now = new Date();
  const $set: Record<string, unknown> = {
    gateDeliveryStatus: to,
    gateUpdatedAt: now,
    gateUpdatedByUserId: audit.userId,
    gateUpdatedByName: audit.userName,
  };
  if (to === "out_for_delivery") $set.gateOutAt = now;
  if (to === "delivered") $set.gateDeliveredAt = now;
  if (to === "pending_redelivery") $set.gatePendingAt = now;
  return $set;
}

/** Orders Rashid has prepared for dispatch (on a trip or vehicle recorded). */
export function gateEligibleMongoFilter() {
  return {
    $or: [
      { dispatchTripId: { $ne: null } },
      { "dispatch.vehicleNo": { $regex: /\S/ } },
      { "dispatch.dcNo": { $regex: /\S/ } },
    ],
  };
}

export function nextGateActions(status: GateDeliveryStatus): GateDeliveryStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}
