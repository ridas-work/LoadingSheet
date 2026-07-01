import mongoose, { type InferSchemaType } from "mongoose";

const SampleProductionMovementSchema = new mongoose.Schema(
  {
    visitTicketId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "FieldVisitTicket" },
    productionBatchId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ProductionBatch" },
    batchNo: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    bottles: { type: Number, required: true, min: 1 },
    liters: { type: Number, required: true, min: 0.001 },
    recordedAt: { type: Date, required: true, default: () => new Date() },
    recordedByName: { type: String, required: false, default: "", trim: true },
    repUsername: { type: String, required: false, default: "", trim: true, lowercase: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SampleProductionMovementSchema.index({ visitTicketId: 1 });
SampleProductionMovementSchema.index({ productionBatchId: 1 });

export type SampleProductionMovementDoc = InferSchemaType<typeof SampleProductionMovementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SampleProductionMovement =
  (mongoose.models.SampleProductionMovement as mongoose.Model<SampleProductionMovementDoc>) ||
  mongoose.model<SampleProductionMovementDoc>("SampleProductionMovement", SampleProductionMovementSchema);
