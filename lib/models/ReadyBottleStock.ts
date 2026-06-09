import mongoose, { type InferSchemaType } from "mongoose";

const ReadyBottleStockSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, trim: true, lowercase: true, unique: true },
    productName: { type: String, required: true, trim: true },
    onHandBottles: { type: Number, required: true, default: 0, min: 0 },
    openingBalanceSetAt: { type: Date, required: false, default: null },
    updatedByUserId: { type: String, required: false, default: null },
    updatedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type ReadyBottleStockDoc = InferSchemaType<typeof ReadyBottleStockSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ReadyBottleStock =
  (mongoose.models.ReadyBottleStock as mongoose.Model<ReadyBottleStockDoc>) ||
  mongoose.model<ReadyBottleStockDoc>("ReadyBottleStock", ReadyBottleStockSchema);
