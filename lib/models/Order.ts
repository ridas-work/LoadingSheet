import mongoose, { type InferSchemaType } from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    boxes: { type: Number, required: true, min: 1 },
    bottlesPerBox: { type: Number, required: true, min: 1, default: 10 },
  },
  { _id: false },
);

const BatchDefSchema = new mongoose.Schema(
  {
    batchNo: { type: String, required: true, trim: true },
    totalLiters: { type: Number, required: true, min: 0.001 },
  },
  { _id: false },
);

const DispatchSchema = new mongoose.Schema(
  {
    vehicleNo: { type: String, required: false, default: "" },
    driverName: { type: String, required: false, default: "" },
    dcNo: { type: String, required: false, default: "" },
    helperName: { type: String, required: false, default: "" },
    productionIncharge: { type: String, required: false, default: "" },
    securityName: { type: String, required: false, default: "" },
    driverSignature: { type: String, required: false, default: "" },
  },
  { _id: false },
);

const SheetLineSchema = new mongoose.Schema(
  {
    boxNo: { type: Number, required: true, min: 1 },
    productName: { type: String, required: true, trim: true },
    bottlesPerBox: { type: Number, required: true, min: 1 },
    batchNo: { type: String, required: false, default: "" },
    weight: { type: Number, required: false, default: null },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator(v: unknown) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one item is required.",
      },
    },
    sheetLines: {
      type: [SheetLineSchema],
      required: true,
      default: [],
    },
    createdByUserId: { type: String, required: false, default: null },
    createdByName: { type: String, required: false, default: "" },
    batchUpdatedByUserId: { type: String, required: false, default: null },
    batchUpdatedByName: { type: String, required: false, default: "" },
    batchUpdatedAt: { type: Date, required: false, default: null },
    batchDefs: {
      type: [BatchDefSchema],
      required: false,
      default: [],
    },
    dispatch: {
      type: DispatchSchema,
      required: false,
      default: () => ({}),
    },
    dispatchUpdatedByUserId: { type: String, required: false, default: null },
    dispatchUpdatedByName: { type: String, required: false, default: "" },
    dispatchUpdatedAt: { type: Date, required: false, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type OrderDoc = InferSchemaType<typeof OrderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Order =
  (mongoose.models.Order as mongoose.Model<OrderDoc>) ||
  mongoose.model<OrderDoc>("Order", OrderSchema);
