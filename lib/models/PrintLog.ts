import mongoose, { type InferSchemaType } from "mongoose";

import { PRINT_DOCUMENT_TYPES } from "@/lib/printLog.types";

const PrintLogSchema = new mongoose.Schema(
  {
    printedByUserId: { type: String, required: true, trim: true },
    printedByName: { type: String, required: true, trim: true },
    printedByUsername: { type: String, required: true, trim: true, lowercase: true },
    documentType: {
      type: String,
      enum: PRINT_DOCUMENT_TYPES,
      required: true,
    },
    documentTitle: { type: String, required: true, trim: true },
    referenceId: { type: String, required: false, default: null, trim: true },
    referencePath: { type: String, required: false, default: null, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false, default: {} },
    printedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PrintLogSchema.index({ printedAt: -1 });
PrintLogSchema.index({ printedByUsername: 1, printedAt: -1 });
PrintLogSchema.index({ documentType: 1, printedAt: -1 });
PrintLogSchema.index({ referenceId: 1, printedAt: -1 });

export type PrintLogDoc = InferSchemaType<typeof PrintLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (mongoose.models.PrintLog) {
  delete mongoose.models.PrintLog;
}

export const PrintLog = mongoose.model<PrintLogDoc>("PrintLog", PrintLogSchema);
