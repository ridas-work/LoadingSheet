import mongoose, { type InferSchemaType } from "mongoose";

const ChemicalRawMaterialSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: false, default: "kg", trim: true },
    onHand: { type: Number, required: true, default: 0, min: 0 },
    sortOrder: { type: Number, required: false, default: 0 },
    active: { type: Boolean, required: false, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type ChemicalRawMaterialDoc = InferSchemaType<typeof ChemicalRawMaterialSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ChemicalRawMaterial =
  (mongoose.models.ChemicalRawMaterial as mongoose.Model<ChemicalRawMaterialDoc>) ||
  mongoose.model<ChemicalRawMaterialDoc>("ChemicalRawMaterial", ChemicalRawMaterialSchema);
