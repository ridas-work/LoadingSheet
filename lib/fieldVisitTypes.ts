/** Client-safe field visit types and labels (no mongoose). */

export const FIELD_VISIT_STATUSES = [
  "active",
  "visit_concluded",
  "closed_won",
  "closed_lost",
  "sample_requested",
  "sample_delivered",
] as const;

export type FieldVisitStatus = "active" | "visit_concluded" | "closed_won" | "closed_lost";

export type FieldVisitStatusStored = (typeof FIELD_VISIT_STATUSES)[number];

export const SAMPLE_MODES = ["none", "outgoing", "incoming"] as const;
export type SampleMode = (typeof SAMPLE_MODES)[number];

export const SAMPLE_FEEDBACK_VALUES = ["pending", "liked", "disliked", "neutral"] as const;
export type SampleFeedback = (typeof SAMPLE_FEEDBACK_VALUES)[number];

export const SAMPLE_MODE_LABELS: Record<SampleMode, string> = {
  none: "No sample",
  outgoing: "We send sample",
  incoming: "Customer gave sample",
};

export const STATUS_LABELS: Record<FieldVisitStatus, string> = {
  active: "In progress",
  visit_concluded: "Awaiting order",
  closed_won: "Won",
  closed_lost: "Lost",
};

export type TicketAction =
  | "update_profile"
  | "request_sample_approval"
  | "record_sample_event"
  | "add_visit"
  | "final_conclude"
  | "close_lost"
  | "update_market_visit"
  | "submit_market_visit";

export type VisitKind = "sales" | "market_audit";

export type SerializedMarketVisitRow = {
  storeName: string;
  location: string;
  availability: Record<string, "yes" | "no" | "">;
  facingUnits: Record<string, number | null>;
  remarks: string;
};

export const SAMPLE_APPROVAL_STATUSES = ["none", "pending", "approved", "rejected"] as const;
export type SampleApprovalStatus = (typeof SAMPLE_APPROVAL_STATUSES)[number];

export const SAMPLE_APPROVAL_LABELS: Record<SampleApprovalStatus, string> = {
  none: "",
  pending: "Awaiting Waleed approval",
  approved: "Approved — record delivery & reaction",
  rejected: "Rejected by Waleed",
};

export type SerializedVisitLog = {
  id: string;
  visitDate: string;
  conclusion: string;
  recordedAt: string;
  recordedByName: string;
};

export const VISIT_KIND_LABELS: Record<VisitKind, string> = {
  sales: "Sales visit",
  market_audit: "Market visit",
};

export type SerializedTicket = {
  id: string;
  visitKind: VisitKind;
  marketVisitDate: string | null;
  marketVisitRemarks: string;
  marketVisitRows: SerializedMarketVisitRow[];
  marketVisitSubmittedAt: string | null;
  placeName: string;
  customerName: string;
  city: string;
  contactPhone: string;
  contactPerson: string;
  notes: string;
  sampleProducts: { productName: string; notes: string; bottles: number }[];
  sampleMode: SampleMode;
  status: FieldVisitStatus;
  sampleRequestedAt: string | null;
  sampleDeliveredAt: string | null;
  sampleReceivedAt: string | null;
  followUpDueAt: string | null;
  followUpCompletedAt: string | null;
  followUpComments: string;
  followUpFeedback: SampleFeedback;
  visitLogs: SerializedVisitLog[];
  visitLogCount: number;
  finalConclusion: string;
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
  sampleApprovalStatus: SampleApprovalStatus;
  sampleApprovalRequestedAt: string | null;
  sampleApprovedAt: string | null;
  sampleApprovedByName: string;
  sampleRejectionNote: string;
  needsFollowUp: boolean;
  allowedActions: TicketAction[];
  createdAt: string;
  updatedAt: string;
};
