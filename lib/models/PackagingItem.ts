import mongoose, { type InferSchemaType } from "mongoose";

const CATEGORIES = [
  "bottle",
  "cap",
  "sticker",
  "label",
  "box",
  "pouch",
  "partition",
  "other",
] as const;

const DEDUCT_AS = [
  "bottle",
  "cap",
  "sticker",
  "label",
  "box",
  "pouch",
  "partition",
  "other",
] as const;

const PackagingItemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    sortOrder: { type: Number, required: false, default: 0 },
    unit: { type: String, required: false, default: "pcs", trim: true },
    purchasedQty: { type: Number, required: true, default: 0, min: 0 },
    rejectedDamage: { type: Number, required: true, default: 0, min: 0 },
    uip: { type: Number, required: true, default: 0, min: 0 },
    /** @deprecated Legacy physical count; kept in sync with balance on save. */
    onHand: { type: Number, required: true, default: 0 },
    linkedProductCode: { type: String, required: false, default: "", trim: true, lowercase: true },
    linkedBatchFamily: { type: String, required: false, default: "", trim: true, lowercase: true },
    deductAs: { type: String, required: false, enum: DEDUCT_AS, default: "other" },
    active: { type: Boolean, required: false, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type PackagingItemDoc = InferSchemaType<typeof PackagingItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type PackagingCategory = (typeof CATEGORIES)[number];
export type PackagingDeductAs = (typeof DEDUCT_AS)[number];

export const PackagingItem =
  (mongoose.models.PackagingItem as mongoose.Model<PackagingItemDoc>) ||
  mongoose.model<PackagingItemDoc>("PackagingItem", PackagingItemSchema);
