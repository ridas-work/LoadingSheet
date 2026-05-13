import mongoose, { type InferSchemaType } from "mongoose";

const ProductionBatchSchema = new mongoose.Schema(
  {
    batchNo: { type: String, required: true, trim: true, unique: true },
    productName: { type: String, required: true, trim: true },
    totalLiters: { type: Number, required: true, min: 0.001 },
    preparedAt: { type: Date, required: true, default: () => new Date() },
    notes: { type: String, required: false, default: "" },
    createdByUserId: { type: String, required: false, default: null },
    createdByName: { type: String, required: false, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type ProductionBatchDoc = InferSchemaType<typeof ProductionBatchSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductionBatch =
  (mongoose.models.ProductionBatch as mongoose.Model<ProductionBatchDoc>) ||
  mongoose.model<ProductionBatchDoc>("ProductionBatch", ProductionBatchSchema);
