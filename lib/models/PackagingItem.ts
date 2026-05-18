import mongoose, { type InferSchemaType } from "mongoose";

const CATEGORIES = ["bottle", "cap", "sticker", "label", "other"] as const;

const PackagingItemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    unit: { type: String, required: false, default: "pcs", trim: true },
    onHand: { type: Number, required: true, default: 0, min: 0 },
    linkedProductCode: { type: String, required: false, default: "", trim: true, lowercase: true },
    active: { type: Boolean, required: false, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type PackagingItemDoc = InferSchemaType<typeof PackagingItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type PackagingCategory = (typeof CATEGORIES)[number];

export const PackagingItem =
  (mongoose.models.PackagingItem as mongoose.Model<PackagingItemDoc>) ||
  mongoose.model<PackagingItemDoc>("PackagingItem", PackagingItemSchema);
