import mongoose, { type InferSchemaType } from "mongoose";

const BatchFillingDailyEntrySchema = new mongoose.Schema(
  {
    batchNo: { type: String, required: true, trim: true },
    entryDate: { type: String, required: true, trim: true }, // ISO date "YYYY-MM-DD"
    filledLitersToday: { type: Number, required: true, default: 0, min: 0 },
    readyToDeliverLiters: { type: Number, required: true, default: 0, min: 0 },
    physicalRemainingLiters: { type: Number, required: true, default: 0, min: 0 },
    /** Snapshot of Nimra's system remaining at save time. */
    systemRemainingLiters: { type: Number, required: true, default: 0, min: 0 },
    /** wasteLiters = systemRemainingLiters − physicalRemainingLiters */
    wasteLiters: { type: Number, required: true, default: 0 },
    note: { type: String, required: false, default: "", trim: true },
    recordedByUserId: { type: String, required: false, default: null },
    recordedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

BatchFillingDailyEntrySchema.index({ batchNo: 1, entryDate: 1 }, { unique: true });

export type BatchFillingDailyEntryDoc = InferSchemaType<typeof BatchFillingDailyEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BatchFillingDailyEntry =
  (mongoose.models.BatchFillingDailyEntry as mongoose.Model<BatchFillingDailyEntryDoc>) ||
  mongoose.model<BatchFillingDailyEntryDoc>("BatchFillingDailyEntry", BatchFillingDailyEntrySchema);
