import mongoose, { type InferSchemaType } from "mongoose";

const REASONS = [
  "opening_balance",
  "batch_lot_add",
  "filling_ready",
  "delivered",
  "delivery_return",
  "manual_adjust",
] as const;

const ReadyBottleMovementSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, trim: true, lowercase: true },
    productName: { type: String, required: true, trim: true },
    delta: { type: Number, required: true },
    onHandAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, enum: REASONS },
    note: { type: String, required: false, default: "", trim: true },
    batchNo: { type: String, required: false, default: "", trim: true },
    orderId: { type: String, required: false, default: null },
    poNumber: { type: String, required: false, default: "", trim: true },
    entryDate: { type: String, required: false, default: "", trim: true },
    recordedByUserId: { type: String, required: false, default: null },
    recordedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

ReadyBottleMovementSchema.index({ createdAt: -1 });
ReadyBottleMovementSchema.index({ productCode: 1, createdAt: -1 });

export type ReadyBottleMovementReason = (typeof REASONS)[number];

export type ReadyBottleMovementDoc = InferSchemaType<typeof ReadyBottleMovementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ReadyBottleMovement =
  (mongoose.models.ReadyBottleMovement as mongoose.Model<ReadyBottleMovementDoc>) ||
  mongoose.model<ReadyBottleMovementDoc>("ReadyBottleMovement", ReadyBottleMovementSchema);
