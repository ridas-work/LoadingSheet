import mongoose, { type InferSchemaType } from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    bottles: { type: Number, required: true, min: 1 },
    createdByUserId: { type: String, required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type OrderDoc = InferSchemaType<typeof OrderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Order =
  (mongoose.models.Order as mongoose.Model<OrderDoc>) ||
  mongoose.model<OrderDoc>("Order", OrderSchema);

