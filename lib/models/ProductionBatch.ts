import mongoose, { type InferSchemaType } from "mongoose";

const ProductionBatchSchema = new mongoose.Schema(
  {
    batchNo: { type: String, required: true, trim: true },
    /** standard = main dispatch families; custom_box = drum / custom-carton products only */
    batchKind: {
      type: String,
      enum: ["standard", "custom_box"],
      required: false,
      default: "standard",
    },
    /** regular = customer PO dispatch pool; sample = field visit sample pool only */
    productionPurpose: {
      type: String,
      enum: ["regular", "sample"],
      required: false,
      default: "regular",
    },
    productName: { type: String, required: true, trim: true },
    totalLiters: { type: Number, required: true, min: 0.001 },
    preparedAt: { type: Date, required: true, default: () => new Date() },
    ph: { type: String, required: false, default: "" },
    solids: { type: String, required: false, default: "" },
    appearance: { type: String, required: false, default: "" },
    provider: { type: String, required: false, default: "" },
    hcl: { type: String, required: false, default: "" },
    viscosity: { type: String, required: false, default: "" },
    quantity: { type: String, required: false, default: "" },
    /** Custom-box batches — e.g. 3*150 (three 150 L drums). */
    drum: { type: String, required: false, default: "", trim: true },
    customer: { type: String, required: false, default: "", trim: true },
    notes: { type: String, required: false, default: "" },
    /** approved = available for dispatch; rejected = QC failed, editable; discarded = written off */
    qcOutcome: {
      type: String,
      enum: ["approved", "rejected", "discarded"],
      required: false,
      default: "approved",
    },
    qcComment: { type: String, required: false, default: "", trim: true },
    qcStatusAt: { type: Date, required: false, default: null },
    qcStatusByUserId: { type: String, required: false, default: null },
    qcStatusByName: { type: String, required: false, default: "", trim: true },
    createdByUserId: { type: String, required: false, default: null },
    createdByName: { type: String, required: false, default: "" },
    nimraWasteLiters: { type: Number, required: false, default: null, min: 0 },
    nimraWasteNote: { type: String, required: false, default: "", trim: true },
    nimraWasteRecordedAt: { type: Date, required: false, default: null },
    nimraWasteRecordedByUserId: { type: String, required: false, default: null },
    nimraWasteRecordedByName: { type: String, required: false, default: "", trim: true },
    /** Esha closed the batch — read-only archive; excluded from assignment pools. */
    closedAt: { type: Date, required: false, default: null },
    closedByUserId: { type: String, required: false, default: null },
    closedByName: { type: String, required: false, default: "", trim: true },
    closureWasteLiters: { type: Number, required: false, default: null, min: 0 },
    closureWasteNote: { type: String, required: false, default: "", trim: true },
    closureUsedLitersSnapshot: { type: Number, required: false, default: null, min: 0 },
    closureRemainingLitersSnapshot: { type: Number, required: false, default: null, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

ProductionBatchSchema.index({ batchNo: 1, productName: 1 }, { unique: true });

export type ProductionBatchDoc = InferSchemaType<typeof ProductionBatchSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductionBatch =
  (mongoose.models.ProductionBatch as mongoose.Model<ProductionBatchDoc>) ||
  mongoose.model<ProductionBatchDoc>("ProductionBatch", ProductionBatchSchema);
