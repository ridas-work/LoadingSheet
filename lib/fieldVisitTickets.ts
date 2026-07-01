import mongoose, { type HydratedDocument } from "mongoose";

import {
  FIELD_VISIT_STATUSES,
  SAMPLE_MODES,
  type FieldVisitStatus,
  type FieldVisitStatusStored,
  type SampleFeedback,
  type SampleMode,
  type SerializedTicket,
  type TicketAction,
  SAMPLE_FEEDBACK_VALUES,
  type SampleApprovalStatus,
  SAMPLE_APPROVAL_STATUSES,
} from "@/lib/fieldVisitTypes";
import type { FieldVisitTicketDoc } from "@/lib/models/FieldVisitTicket";

export type { SerializedTicket, SerializedVisitLog, SampleMode, FieldVisitStatus, TicketAction } from "@/lib/fieldVisitTypes";
export { SAMPLE_MODES, SAMPLE_MODE_LABELS, SAMPLE_APPROVAL_LABELS, STATUS_LABELS } from "@/lib/fieldVisitTypes";

/** Nouman, Javeria, Aslam & Ahtisham — field visit / sample ticket workflow. */
export const FIELD_VISIT_USERNAMES = ["nouman", "javeria", "aslam", "ahtisham"] as const;

/** Nouman & Javeria share one visit list and can edit each other's tickets. */
export const SHARED_FIELD_VISIT_USERNAMES = ["nouman", "javeria"] as const;

export const POINTS_WON = 10;
export const POINTS_LOST = -5;

/** Reminder to follow up on customer comments this many days after sample delivery. */
export const FOLLOW_UP_DAYS_AFTER_DELIVERY = 14;

function normalizeUsername(username: string | undefined | null): string {
  return username?.toLowerCase().trim() ?? "";
}

export function isFieldVisitRep(username: string | undefined | null): boolean {
  return (FIELD_VISIT_USERNAMES as readonly string[]).includes(normalizeUsername(username));
}

export function isSharedFieldVisitRep(username: string | undefined | null): boolean {
  return (SHARED_FIELD_VISIT_USERNAMES as readonly string[]).includes(normalizeUsername(username));
}

/** True when viewer and ticket owner are both in the Nouman/Javeria shared pool. */
export function sharesFieldVisitPool(
  viewerUsername: string | undefined | null,
  ticketCreatedByUsername: string | undefined | null,
): boolean {
  if (!isSharedFieldVisitRep(viewerUsername)) return false;
  return (SHARED_FIELD_VISIT_USERNAMES as readonly string[]).includes(
    normalizeUsername(ticketCreatedByUsername),
  );
}

/** Mongo filter for listing visits visible to this rep. */
export function fieldVisitsMongoFilter(username: string | undefined | null): Record<string, unknown> {
  const u = normalizeUsername(username);
  if (isSharedFieldVisitRep(u)) {
    return { createdByUsername: { $in: [...SHARED_FIELD_VISIT_USERNAMES] } };
  }
  return { createdByUsername: u };
}

/** Blank tickets from accidental "New visit" — hide from lists. */
export function isEmptyFieldVisitDraft(ticket: {
  placeName?: string | null;
  customerName?: string | null;
  visitLogCount?: number;
  visitLogs?: unknown[] | null;
  sampleMode?: string | null;
  finalConclusion?: string | null;
  notes?: string | null;
}): boolean {
  if (ticket.placeName?.trim() || ticket.customerName?.trim()) return false;
  const logCount =
    ticket.visitLogCount ?? (Array.isArray(ticket.visitLogs) ? ticket.visitLogs.length : 0);
  if (logCount > 0) return false;
  if (ticket.sampleMode && ticket.sampleMode !== "none") return false;
  if (ticket.finalConclusion?.trim()) return false;
  if (ticket.notes?.trim()) return false;
  return true;
}

export function canAccessFieldVisits(role: string | null, username: string | undefined | null): boolean {
  if (role === "admin") return true;
  return role === "po_creator" && isFieldVisitRep(username);
}

export function canEditFieldVisit(
  role: string | null,
  username: string | undefined | null,
  ticket: { createdByUserId: mongoose.Types.ObjectId | string; createdByUsername?: string },
  userId: string,
): boolean {
  if (role === "admin") return true;
  if (!isFieldVisitRep(username)) return false;

  if (sharesFieldVisitPool(username, ticket.createdByUsername)) return true;

  const ownerId =
    typeof ticket.createdByUserId === "string"
      ? ticket.createdByUserId
      : ticket.createdByUserId.toString();
  if (ownerId !== userId) return false;
  const u = normalizeUsername(username);
  const ticketUser = normalizeUsername(ticket.createdByUsername);
  return ticketUser === u || ticketUser === "";
}

export function normalizeTicketStatus(status: unknown): FieldVisitStatus {
  if (status === "visit_concluded" || status === "closed_won" || status === "closed_lost") {
    return status;
  }
  return "active";
}

export function isStoredStatus(s: string): s is FieldVisitStatusStored {
  return (FIELD_VISIT_STATUSES as readonly string[]).includes(s);
}

export function parseSampleMode(v: unknown): SampleMode | null {
  if (typeof v !== "string") return null;
  const s = v.trim() as SampleMode;
  return (SAMPLE_MODES as readonly string[]).includes(s) ? s : null;
}

export function followUpDueFromDelivery(deliveredAt: Date): Date {
  const d = new Date(deliveredAt);
  d.setDate(d.getDate() + FOLLOW_UP_DAYS_AFTER_DELIVERY);
  return d;
}

export function needsFollowUpReminder(ticket: {
  status: unknown;
  sampleMode?: SampleMode | string | null;
  sampleDeliveredAt?: Date | null;
  followUpDueAt?: Date | null;
  followUpCompletedAt?: Date | null;
  closedAt?: Date | null;
}): boolean {
  const status = normalizeTicketStatus(ticket.status);
  if (ticket.closedAt || status === "closed_won" || status === "closed_lost") {
    return false;
  }
  if ((ticket.sampleMode ?? "none") !== "outgoing") return false;
  if (!ticket.sampleDeliveredAt) return false;
  if (ticket.followUpCompletedAt) return false;
  const due = ticket.followUpDueAt ?? followUpDueFromDelivery(new Date(ticket.sampleDeliveredAt));
  return Date.now() >= due.getTime();
}

export function parseSampleFeedback(v: unknown): SampleFeedback | null {
  if (typeof v !== "string") return null;
  const s = v.trim() as SampleFeedback;
  return (SAMPLE_FEEDBACK_VALUES as readonly string[]).includes(s) ? s : null;
}

export function normalizeSampleApprovalStatus(v: unknown): SampleApprovalStatus {
  if (typeof v === "string" && (SAMPLE_APPROVAL_STATUSES as readonly string[]).includes(v)) {
    return v as SampleApprovalStatus;
  }
  return "none";
}

/** Legacy tickets with delivery already recorded count as approved. */
export function effectiveSampleApprovalStatus(ticket: {
  sampleApprovalStatus?: unknown;
  sampleDeliveredAt?: Date | null;
  sampleReceivedAt?: Date | null;
}): SampleApprovalStatus {
  const stored = normalizeSampleApprovalStatus(ticket.sampleApprovalStatus);
  if (stored === "pending" || stored === "rejected") return stored;
  if (stored === "approved") return "approved";
  if (ticket.sampleDeliveredAt || ticket.sampleReceivedAt) return "approved";
  return "none";
}

export function pendingFieldVisitSampleMongoFilter() {
  return { sampleApprovalStatus: "pending" as const };
}

export function visitLogCount(ticket: { visitLogs?: unknown[] | null }): number {
  return Array.isArray(ticket.visitLogs) ? ticket.visitLogs.length : 0;
}

export function allowedActions(
  status: FieldVisitStatus,
  opts: {
    sampleMode?: SampleMode;
    visitLogCount: number;
    sampleApprovalStatus?: SampleApprovalStatus;
  },
): TicketAction[] {
  switch (status) {
    case "active": {
      const actions: TicketAction[] = ["update_profile", "add_visit", "final_conclude"];
      if (opts.sampleMode && opts.sampleMode !== "none") {
        const approval = opts.sampleApprovalStatus ?? "none";
        if (approval === "none" || approval === "rejected") {
          actions.splice(1, 0, "request_sample_approval");
        }
        if (approval === "approved") {
          actions.splice(1, 0, "record_sample_event");
        }
      }
      if (opts.visitLogCount >= 1) {
        actions.push("close_lost");
      }
      return actions;
    }
    case "visit_concluded":
      return ["close_lost"];
    case "closed_won":
    case "closed_lost":
      return [];
    default:
      return [];
  }
}

export function assertActionAllowed(
  status: FieldVisitStatus,
  action: TicketAction,
  opts: {
    sampleMode?: SampleMode;
    visitLogCount: number;
    sampleApprovalStatus?: SampleApprovalStatus;
  },
): string | null {
  if (!allowedActions(status, opts).includes(action)) {
    if (action === "record_sample_event" && opts.sampleApprovalStatus === "pending") {
      return "Sample request is waiting for Waleed approval. Record delivery after approval.";
    }
    if (action === "request_sample_approval" && opts.sampleApprovalStatus === "pending") {
      return "Sample request already sent to Waleed.";
    }
    return `Action "${action}" is not allowed while status is "${status}".`;
  }
  return null;
}

export function serializeTicket(doc: FieldVisitTicketDoc): SerializedTicket {
  const sampleMode = parseSampleMode(doc.sampleMode) ?? "none";
  const status = normalizeTicketStatus(doc.status);
  const logs = (doc.visitLogs ?? []).map((log) => ({
    id: log._id?.toString() ?? "",
    visitDate: log.visitDate ? new Date(log.visitDate).toISOString() : "",
    conclusion: log.conclusion ?? "",
    recordedAt: log.recordedAt ? new Date(log.recordedAt).toISOString() : "",
    recordedByName: log.recordedByName ?? "",
  }));
  const count = logs.length;
  const sampleApprovalStatus = effectiveSampleApprovalStatus(doc);

  return {
    id: doc._id.toString(),
    placeName: doc.placeName ?? "",
    customerName: doc.customerName ?? "",
    city: doc.city ?? "",
    contactPhone: doc.contactPhone ?? "",
    contactPerson: doc.contactPerson ?? "",
    notes: doc.notes ?? "",
    sampleProducts: (doc.sampleProducts ?? []).map((p) => ({
      productName: p.productName ?? "",
      notes: p.notes ?? "",
      bottles: typeof p.bottles === "number" && p.bottles >= 1 ? p.bottles : 1,
    })),
    sampleMode,
    status,
    sampleRequestedAt: doc.sampleRequestedAt ? new Date(doc.sampleRequestedAt).toISOString() : null,
    sampleDeliveredAt: doc.sampleDeliveredAt ? new Date(doc.sampleDeliveredAt).toISOString() : null,
    sampleReceivedAt: doc.sampleReceivedAt ? new Date(doc.sampleReceivedAt).toISOString() : null,
    followUpDueAt: doc.followUpDueAt ? new Date(doc.followUpDueAt).toISOString() : null,
    followUpCompletedAt: doc.followUpCompletedAt
      ? new Date(doc.followUpCompletedAt).toISOString()
      : null,
    followUpComments: doc.followUpComments ?? "",
    followUpFeedback: (doc.followUpFeedback ?? "pending") as SampleFeedback,
    visitLogs: logs,
    visitLogCount: count,
    finalConclusion: doc.finalConclusion ?? "",
    visitConcludedAt: doc.visitConcludedAt ? new Date(doc.visitConcludedAt).toISOString() : null,
    closedAt: doc.closedAt ? new Date(doc.closedAt).toISOString() : null,
    sampleFeedback: (doc.sampleFeedback ?? "pending") as SampleFeedback,
    feedbackComments: doc.feedbackComments ?? "",
    pointsAwarded: doc.pointsAwarded ?? 0,
    linkedOrderId: doc.linkedOrderId ? doc.linkedOrderId.toString() : null,
    linkedPoNumber: doc.linkedPoNumber ?? "",
    createdByName: doc.createdByName ?? "",
    createdByUsername: doc.createdByUsername ?? "",
    closedReason: doc.closedReason ?? "",
    sampleApprovalStatus,
    sampleApprovalRequestedAt: doc.sampleApprovalRequestedAt
      ? new Date(doc.sampleApprovalRequestedAt).toISOString()
      : null,
    sampleApprovedAt: doc.sampleApprovedAt ? new Date(doc.sampleApprovedAt).toISOString() : null,
    sampleApprovedByName: doc.sampleApprovedByName ?? "",
    sampleRejectionNote: doc.sampleRejectionNote ?? "",
    needsFollowUp: needsFollowUpReminder({ ...doc, sampleMode, status }),
    allowedActions: allowedActions(status, {
      sampleMode,
      visitLogCount: count,
      sampleApprovalStatus,
    }),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

export async function closeTicketWon(
  ticket: HydratedDocument<FieldVisitTicketDoc>,
  orderId: mongoose.Types.ObjectId,
  poNumber: string,
): Promise<void> {
  if (ticket.linkedOrderId) {
    throw new Error("This visit ticket is already linked to an order.");
  }
  if (normalizeTicketStatus(ticket.status) !== "visit_concluded") {
    throw new Error("Visit must be concluded before linking an order.");
  }
  ticket.status = "closed_won";
  ticket.linkedOrderId = orderId;
  ticket.linkedPoNumber = poNumber;
  ticket.pointsAwarded = POINTS_WON;
  ticket.closedAt = new Date();
  await ticket.save();
}

export async function closeTicketLost(
  ticket: HydratedDocument<FieldVisitTicketDoc>,
  reason: string,
  closedByUserId?: mongoose.Types.ObjectId,
): Promise<void> {
  const status = normalizeTicketStatus(ticket.status);
  if (status !== "visit_concluded" && status !== "active") {
    throw new Error("Only open visits awaiting outcome can be marked lost.");
  }
  if (status === "active" && visitLogCount(ticket) < 1) {
    throw new Error("Add at least one visit before marking lost.");
  }
  ticket.status = "closed_lost";
  ticket.pointsAwarded = POINTS_LOST;
  ticket.closedAt = new Date();
  ticket.closedReason = reason.trim();
  if (closedByUserId) ticket.closedByUserId = closedByUserId;
  await ticket.save();
}

export function parseSampleProducts(raw: unknown): { productName: string; notes: string; bottles: number }[] {
  const sampleProducts: { productName: string; notes: string; bottles: number }[] = [];
  if (!Array.isArray(raw)) return sampleProducts;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const pn =
      typeof (row as { productName?: unknown }).productName === "string"
        ? (row as { productName: string }).productName.trim()
        : "";
    if (!pn) continue;
    const notes =
      typeof (row as { notes?: unknown }).notes === "string"
        ? (row as { notes: string }).notes.trim()
        : "";
    const bottlesRaw = (row as { bottles?: unknown }).bottles;
    const bottles =
      typeof bottlesRaw === "number" && Number.isInteger(bottlesRaw) && bottlesRaw >= 1
        ? bottlesRaw
        : typeof bottlesRaw === "string" && Number.isInteger(Number(bottlesRaw)) && Number(bottlesRaw) >= 1
          ? Number(bottlesRaw)
          : 1;
    sampleProducts.push({ productName: pn, notes, bottles });
  }
  return sampleProducts;
}
