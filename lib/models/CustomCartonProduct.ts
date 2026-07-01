import mongoose, { type InferSchemaType } from "mongoose";

const CustomCartonProductSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, required: false, default: true },
    addedByUserId: { type: String, required: false, default: null },
    addedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type CustomCartonProductDoc = InferSchemaType<typeof CustomCartonProductSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CustomCartonProduct =
  (mongoose.models.CustomCartonProduct as mongoose.Model<CustomCartonProductDoc>) ||
  mongoose.model<CustomCartonProductDoc>("CustomCartonProduct", CustomCartonProductSchema);
