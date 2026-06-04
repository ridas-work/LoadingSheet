import mongoose, { type InferSchemaType } from "mongoose";

/** Lifecycle: sample_requested → sample_delivered → visit_concluded → closed_won | closed_lost */
export const FIELD_VISIT_STATUSES = [
  "sample_requested",
  "sample_delivered",
  "visit_concluded",
  "closed_won",
  "closed_lost",
] as const;

export type FieldVisitStatus = (typeof FIELD_VISIT_STATUSES)[number];

export const SAMPLE_FEEDBACK_VALUES = ["pending", "liked", "disliked", "neutral"] as const;
export type SampleFeedback = (typeof SAMPLE_FEEDBACK_VALUES)[number];

const SampleProductSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    notes: { type: String, required: false, default: "", trim: true },
  },
  { _id: false },
);

const FieldVisitTicketSchema = new mongoose.Schema(
  {
    placeName: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    city: { type: String, required: false, default: "", trim: true },
    contactPhone: { type: String, required: false, default: "", trim: true },
    contactPerson: { type: String, required: false, default: "", trim: true },
    notes: { type: String, required: false, default: "", trim: true },
    sampleProducts: { type: [SampleProductSchema], required: false, default: [] },

    status: {
      type: String,
      required: true,
      enum: FIELD_VISIT_STATUSES,
      default: "sample_requested",
    },
    sampleRequestedAt: { type: Date, required: true, default: () => new Date() },
    sampleDeliveredAt: { type: Date, required: false, default: null },
    /** sampleDeliveredAt + 14 days — reminder to call back for customer comments */
    followUpDueAt: { type: Date, required: false, default: null },
    followUpCompletedAt: { type: Date, required: false, default: null },
    followUpComments: { type: String, required: false, default: "", trim: true },
    followUpFeedback: {
      type: String,
      required: false,
      enum: SAMPLE_FEEDBACK_VALUES,
      default: "pending",
    },

    visitConcludedAt: { type: Date, required: false, default: null },
    closedAt: { type: Date, required: false, default: null },

    sampleFeedback: {
      type: String,
      required: false,
      enum: SAMPLE_FEEDBACK_VALUES,
      default: "pending",
    },
    feedbackComments: { type: String, required: false, default: "", trim: true },

    pointsAwarded: { type: Number, required: false, default: 0 },
    linkedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: false, default: null },
    linkedPoNumber: { type: String, required: false, default: "", trim: true },

    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true, trim: true },
    createdByUsername: { type: String, required: true, trim: true, lowercase: true },

    closedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null },
    closedReason: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

FieldVisitTicketSchema.index({ createdByUserId: 1, status: 1 });
FieldVisitTicketSchema.index({ linkedOrderId: 1 }, { sparse: true });
FieldVisitTicketSchema.index({ customerName: 1 });
FieldVisitTicketSchema.index({ followUpDueAt: 1, followUpCompletedAt: 1 });

export type FieldVisitTicketDoc = InferSchemaType<typeof FieldVisitTicketSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FieldVisitTicket =
  (mongoose.models.FieldVisitTicket as mongoose.Model<FieldVisitTicketDoc>) ||
  mongoose.model<FieldVisitTicketDoc>("FieldVisitTicket", FieldVisitTicketSchema);
