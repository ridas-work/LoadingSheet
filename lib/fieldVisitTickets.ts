import mongoose, { type HydratedDocument } from "mongoose";

import {
  FIELD_VISIT_STATUSES,
  type FieldVisitStatus,
  type FieldVisitTicketDoc,
  type SampleFeedback,
  SAMPLE_FEEDBACK_VALUES,
} from "@/lib/models/FieldVisitTicket";

/** Only Nouman and Javeria use field visit tickets in v1. */
export const FIELD_VISIT_USERNAMES = ["nouman", "javeria"] as const;

export const POINTS_WON = 10;
export const POINTS_LOST = -5;

/** Reminder to follow up on customer comments this many days after sample delivery. */
export const FOLLOW_UP_DAYS_AFTER_DELIVERY = 14;

export function isFieldVisitRep(username: string | undefined | null): boolean {
  const u = username?.toLowerCase().trim() ?? "";
  return (FIELD_VISIT_USERNAMES as readonly string[]).includes(u);
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
  const ownerId =
    typeof ticket.createdByUserId === "string"
      ? ticket.createdByUserId
      : ticket.createdByUserId.toString();
  if (ownerId !== userId) return false;
  const u = username?.toLowerCase().trim() ?? "";
  const ticketUser = ticket.createdByUsername?.toLowerCase().trim() ?? "";
  return ticketUser === u || ticketUser === "";
}

export function followUpDueFromDelivery(deliveredAt: Date): Date {
  const d = new Date(deliveredAt);
  d.setDate(d.getDate() + FOLLOW_UP_DAYS_AFTER_DELIVERY);
  return d;
}

export function needsFollowUpReminder(ticket: {
  status: FieldVisitStatus;
  sampleDeliveredAt?: Date | null;
  followUpDueAt?: Date | null;
  followUpCompletedAt?: Date | null;
  closedAt?: Date | null;
}): boolean {
  if (ticket.closedAt || ticket.status === "closed_won" || ticket.status === "closed_lost") {
    return false;
  }
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

export function isValidStatus(s: string): s is FieldVisitStatus {
  return (FIELD_VISIT_STATUSES as readonly string[]).includes(s);
}

export type TicketAction =
  | "deliver_sample"
  | "record_follow_up"
  | "conclude"
  | "close_lost";

export function allowedActions(status: FieldVisitStatus): TicketAction[] {
  switch (status) {
    case "sample_requested":
      return ["deliver_sample"];
    case "sample_delivered":
      return ["record_follow_up", "conclude"];
    case "visit_concluded":
      return ["record_follow_up", "close_lost"];
    case "closed_won":
    case "closed_lost":
      return [];
    default:
      return [];
  }
}

export function assertActionAllowed(status: FieldVisitStatus, action: TicketAction): string | null {
  if (!allowedActions(status).includes(action)) {
    return `Action "${action}" is not allowed while status is "${status}".`;
  }
  return null;
}

export type SerializedTicket = {
  id: string;
  placeName: string;
  customerName: string;
  city: string;
  contactPhone: string;
  contactPerson: string;
  notes: string;
  sampleProducts: { productName: string; notes: string }[];
  status: FieldVisitStatus;
  sampleRequestedAt: string;
  sampleDeliveredAt: string | null;
  followUpDueAt: string | null;
  followUpCompletedAt: string | null;
  followUpComments: string;
  followUpFeedback: SampleFeedback;
  visitConcludedAt: string | null;
  closedAt: string | null;
  sampleFeedback: SampleFeedback;
  feedbackComments: string;
  pointsAwarded: number;
  linkedOrderId: string | null;
  linkedPoNumber: string;
  createdByName: string;
  createdByUsername: string;
  closedReason: string;
  needsFollowUp: boolean;
  allowedActions: TicketAction[];
  createdAt: string;
  updatedAt: string;
};

export function serializeTicket(doc: FieldVisitTicketDoc): SerializedTicket {
  const status = doc.status as FieldVisitStatus;
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
    })),
    status,
    sampleRequestedAt: doc.sampleRequestedAt?.toISOString() ?? "",
    sampleDeliveredAt: doc.sampleDeliveredAt ? new Date(doc.sampleDeliveredAt).toISOString() : null,
    followUpDueAt: doc.followUpDueAt ? new Date(doc.followUpDueAt).toISOString() : null,
    followUpCompletedAt: doc.followUpCompletedAt
      ? new Date(doc.followUpCompletedAt).toISOString()
      : null,
    followUpComments: doc.followUpComments ?? "",
    followUpFeedback: (doc.followUpFeedback ?? "pending") as SampleFeedback,
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
    needsFollowUp: needsFollowUpReminder(doc),
    allowedActions: allowedActions(status),
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
  if (ticket.status !== "visit_concluded") {
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
  if (ticket.status !== "visit_concluded" && ticket.status !== "sample_delivered") {
    throw new Error("Only open visits awaiting outcome can be marked lost.");
  }
  ticket.status = "closed_lost";
  ticket.pointsAwarded = POINTS_LOST;
  ticket.closedAt = new Date();
  ticket.closedReason = reason.trim();
  if (closedByUserId) ticket.closedByUserId = closedByUserId;
  await ticket.save();
}
