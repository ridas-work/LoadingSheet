import mongoose, { type InferSchemaType } from "mongoose";

const MarketVisitStoreAlertSchema = new mongoose.Schema(
  {
    storeKey: { type: String, required: true, trim: true, lowercase: true, index: true },
    storeName: { type: String, required: true, trim: true },
    location: { type: String, required: false, default: "", trim: true },
    skuKey: { type: String, required: true, trim: true, lowercase: true },
    openedAt: { type: Date, required: true, default: Date.now },
    openedByVisitId: { type: String, required: true, trim: true },
    openedByUsername: { type: String, required: true, trim: true, lowercase: true },
    resolvedAt: { type: Date, required: false, default: null },
    resolvedByVisitId: { type: String, required: false, default: null, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MarketVisitStoreAlertSchema.index({ storeKey: 1, resolvedAt: 1 });
MarketVisitStoreAlertSchema.index(
  { storeKey: 1, skuKey: 1 },
  { unique: true, partialFilterExpression: { resolvedAt: null } },
);

export type MarketVisitStoreAlertDoc = InferSchemaType<typeof MarketVisitStoreAlertSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (mongoose.models.MarketVisitStoreAlert) {
  delete mongoose.models.MarketVisitStoreAlert;
}

export const MarketVisitStoreAlert = mongoose.model<MarketVisitStoreAlertDoc>(
  "MarketVisitStoreAlert",
  MarketVisitStoreAlertSchema,
);
