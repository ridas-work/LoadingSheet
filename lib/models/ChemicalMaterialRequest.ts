import mongoose, { type InferSchemaType } from "mongoose";

const STATUSES = ["pending", "approved", "ordered", "rejected"] as const;

const ChemicalMaterialRequestAccessorySchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, trim: true, lowercase: true },
    itemName: { type: String, required: true, trim: true },
    quantityRequested: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true, default: "pcs", trim: true },
    onHandAtRequest: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const ChemicalMaterialRequestSchema = new mongoose.Schema(
  {
    materialCode: { type: String, required: true, trim: true, lowercase: true },
    materialName: { type: String, required: true, trim: true },
    quantityRequested: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true, default: "kg", trim: true },
    onHandAtRequest: { type: Number, required: true, default: 0, min: 0 },
    accessories: {
      type: [ChemicalMaterialRequestAccessorySchema],
      required: false,
      default: [],
    },
    status: { type: String, required: true, enum: STATUSES, default: "pending" },
    note: { type: String, required: false, default: "", trim: true },
    adminNote: { type: String, required: false, default: "", trim: true },
    requestedByUserId: { type: String, required: false, default: "" },
    requestedByName: { type: String, required: true, trim: true },
    requestedByUsername: { type: String, required: false, default: "", trim: true },
    reviewedByName: { type: String, required: false, default: "", trim: true },
    reviewedAt: { type: Date, required: false, default: null },
    orderedAt: { type: Date, required: false, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

ChemicalMaterialRequestSchema.index({ status: 1, createdAt: -1 });
ChemicalMaterialRequestSchema.index({ requestedByUsername: 1, createdAt: -1 });

export type ChemicalMaterialRequestDoc = InferSchemaType<typeof ChemicalMaterialRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type ChemicalRequestStatus = (typeof STATUSES)[number];

export const ChemicalMaterialRequest =
  (mongoose.models.ChemicalMaterialRequest as mongoose.Model<ChemicalMaterialRequestDoc>) ||
  mongoose.model<ChemicalMaterialRequestDoc>(
    "ChemicalMaterialRequest",
    ChemicalMaterialRequestSchema,
  );
