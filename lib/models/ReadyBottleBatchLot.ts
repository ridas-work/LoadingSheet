import mongoose, { type InferSchemaType } from "mongoose";

/** Pre-filled bottles on the production floor, tracked by batch + product. */
const ReadyBottleBatchLotSchema = new mongoose.Schema(
  {
    batchNo: { type: String, required: true, trim: true },
    productCode: { type: String, required: true, trim: true, lowercase: true },
    productName: { type: String, required: true, trim: true },
    bottles: { type: Number, required: true, default: 0, min: 0 },
    /** True when batchNo matched Nimra ProductionBatch at save time. */
    nimraLinked: { type: Boolean, required: true, default: false },
    /** Snapshot of Nimra batch product name when linked. */
    batchProductName: { type: String, required: false, default: "", trim: true },
    note: { type: String, required: false, default: "", trim: true },
    /** When saved as part of a multi-product bundle (e.g. brighten + fabrito). */
    bundleCode: { type: String, required: false, default: "", trim: true, lowercase: true },
    bundleSetId: { type: String, required: false, default: "", trim: true },
    recordedByUserId: { type: String, required: false, default: null },
    recordedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

ReadyBottleBatchLotSchema.index({ batchNo: 1, productCode: 1, bundleSetId: 1 }, { unique: true });

export type ReadyBottleBatchLotDoc = InferSchemaType<typeof ReadyBottleBatchLotSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ReadyBottleBatchLot =
  (mongoose.models.ReadyBottleBatchLot as mongoose.Model<ReadyBottleBatchLotDoc>) ||
  mongoose.model<ReadyBottleBatchLotDoc>("ReadyBottleBatchLot", ReadyBottleBatchLotSchema);
