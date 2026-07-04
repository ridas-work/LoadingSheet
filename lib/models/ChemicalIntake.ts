import mongoose, { type InferSchemaType } from "mongoose";

const QC_OUTCOMES = ["approved", "rejected"] as const;

const ChemicalIntakeSchema = new mongoose.Schema(
  {
    materialCode: { type: String, required: true, trim: true, lowercase: true },
    materialName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true, default: "kg", trim: true },
    qcOutcome: { type: String, required: true, enum: QC_OUTCOMES, default: "approved" },
    qcComment: { type: String, required: false, default: "", trim: true },
    appearance: { type: String, required: false, default: "", trim: true },
    ph: { type: String, required: false, default: "", trim: true },
    solids: { type: String, required: false, default: "", trim: true },
    provider: { type: String, required: false, default: "", trim: true },
    lotNo: { type: String, required: false, default: "", trim: true },
    receivedAt: { type: Date, required: true, default: () => new Date() },
    recordedByUserId: { type: String, required: false, default: "" },
    recordedByName: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

ChemicalIntakeSchema.index({ createdAt: -1 });
ChemicalIntakeSchema.index({ materialCode: 1, createdAt: -1 });

export type ChemicalIntakeDoc = InferSchemaType<typeof ChemicalIntakeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type ChemicalIntakeQcOutcome = (typeof QC_OUTCOMES)[number];

export const ChemicalIntake =
  (mongoose.models.ChemicalIntake as mongoose.Model<ChemicalIntakeDoc>) ||
  mongoose.model<ChemicalIntakeDoc>("ChemicalIntake", ChemicalIntakeSchema);
