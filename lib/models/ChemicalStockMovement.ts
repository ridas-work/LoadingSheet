import mongoose, { type InferSchemaType } from "mongoose";

const MOVEMENT_TYPES = ["intake", "request_approved", "admin_adjust"] as const;

const ChemicalStockMovementSchema = new mongoose.Schema(
  {
    materialCode: { type: String, required: true, trim: true, lowercase: true, index: true },
    movementType: { type: String, required: true, enum: MOVEMENT_TYPES },
    quantityDelta: { type: Number, required: true },
    onHandAfter: { type: Number, required: true, min: 0 },
    referenceId: { type: String, required: false, default: "", trim: true },
    note: { type: String, required: false, default: "", trim: true },
    recordedByUserId: { type: String, required: false, default: "" },
    recordedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type ChemicalStockMovementDoc = InferSchemaType<typeof ChemicalStockMovementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type ChemicalStockMovementType = (typeof MOVEMENT_TYPES)[number];

export const ChemicalStockMovement =
  (mongoose.models.ChemicalStockMovement as mongoose.Model<ChemicalStockMovementDoc>) ||
  mongoose.model<ChemicalStockMovementDoc>(
    "ChemicalStockMovement",
    ChemicalStockMovementSchema,
  );
