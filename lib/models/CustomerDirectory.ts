import mongoose, { type InferSchemaType } from "mongoose";

const CustomerDirectorySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, required: false, default: true },
    addedByUserId: { type: String, required: false, default: null },
    addedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

CustomerDirectorySchema.index({ name: 1 });

export type CustomerDirectoryDoc = InferSchemaType<typeof CustomerDirectorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CustomerDirectory =
  (mongoose.models.CustomerDirectory as mongoose.Model<CustomerDirectoryDoc>) ||
  mongoose.model<CustomerDirectoryDoc>("CustomerDirectory", CustomerDirectorySchema);
