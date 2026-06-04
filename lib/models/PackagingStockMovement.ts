import mongoose, { type InferSchemaType } from "mongoose";

/** `used` kept for legacy rows; new delivery deducts use `delivered`. */
const REASONS = [
  "count",
  "purchase_adjust",
  "rejected",
  "filling",
  "delivered",
  "received",
  "used",
  "adjustment",
  "other",
] as const;

const PackagingStockMovementSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, trim: true, lowercase: true, index: true },
    quantityDelta: { type: Number, required: true },
    quantityAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, enum: REASONS, default: "count" },
    note: { type: String, required: false, default: "", trim: true },
    recordedByUserId: { type: String, required: false, default: null },
    recordedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type PackagingStockMovementDoc = InferSchemaType<typeof PackagingStockMovementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PackagingStockMovement =
  (mongoose.models.PackagingStockMovement as mongoose.Model<PackagingStockMovementDoc>) ||
  mongoose.model<PackagingStockMovementDoc>(
    "PackagingStockMovement",
    PackagingStockMovementSchema,
  );
