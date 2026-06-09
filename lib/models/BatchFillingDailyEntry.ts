import mongoose, { type InferSchemaType } from "mongoose";

const PackagingUipAppliedSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, trim: true, lowercase: true },
    filledBottlesApplied: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const ReadyLedgerAppliedSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, trim: true, lowercase: true },
    readyBottlesApplied: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const BatchFillingPackingLineSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, trim: true, lowercase: true },
    productName: { type: String, required: true, trim: true },
    /** Snapshot from ProductPacking at save time; bottle counts are operator-entered. */
    litersPerBottle: { type: Number, required: true, min: 0.001 },
    filledBottlesToday: { type: Number, required: true, default: 0, min: 0 },
    readyToDeliverBottles: { type: Number, required: true, default: 0, min: 0 },
    /** Derived snapshots so historical rows do not change if catalog values change. */
    filledLitersTodaySnapshot: { type: Number, required: true, default: 0, min: 0 },
    readyToDeliverLitersSnapshot: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const BatchFillingDailyEntrySchema = new mongoose.Schema(
  {
    batchNo: { type: String, required: true, trim: true },
    entryDate: { type: String, required: true, trim: true }, // ISO date "YYYY-MM-DD"
    packingLines: { type: [BatchFillingPackingLineSchema], required: false, default: [] },
    /** Filled-bottle counts already applied to packaging UIP for this entry (idempotent re-save). */
    packagingUipApplied: { type: [PackagingUipAppliedSchema], required: false, default: [] },
    /** Ready-bottle counts already applied to ready stock ledger (idempotent re-save). */
    readyLedgerApplied: { type: [ReadyLedgerAppliedSchema], required: false, default: [] },
    /** Derived from packingLines; old records may contain manually-entered liter values. */
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
