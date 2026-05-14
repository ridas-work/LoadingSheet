import mongoose, { type InferSchemaType } from "mongoose";

const ProductPackingSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    bottlesPerCarton: { type: Number, required: true, min: 1 },
    litersPerBottle: { type: Number, required: true, min: 0.001 },
    active: { type: Boolean, required: true, default: true },
    aliases: { type: [String], default: [] },
    batchFamily: { type: String, required: false, default: "" },
    summaryLabel: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: true },
);

export type ProductPackingDoc = InferSchemaType<typeof ProductPackingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductPacking =
  (mongoose.models.ProductPacking as mongoose.Model<ProductPackingDoc>) ||
  mongoose.model<ProductPackingDoc>("ProductPacking", ProductPackingSchema);
