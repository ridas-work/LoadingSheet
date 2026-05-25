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

const MixedSampleContentSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    bottles: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const MixedSampleSchema = new mongoose.Schema(
  {
    boxCount: { type: Number, required: true, min: 1 },
    contents: {
      type: [MixedSampleContentSchema],
      required: true,
      validate: {
        validator(v: unknown) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one product in the mixed sample box is required.",
      },
    },
  },
  { _id: false },
);

const CustomCartonSchema = new mongoose.Schema(
  {
    boxCount: { type: Number, required: true, min: 1 },
    contents: {
      type: [MixedSampleContentSchema],
      required: true,
      validate: {
        validator(v: unknown) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one product line is required in a custom carton.",
      },
    },
    label: { type: String, required: false, default: "", trim: true },
  },
  { _id: false },
);

const SheetLineSchema = new mongoose.Schema(
  {
    boxNo: { type: Number, required: true, min: 1 },
    productName: { type: String, required: true, trim: true },
    bottlesPerBox: { type: Number, required: true, min: 1 },
    lineKind: {
      type: String,
      enum: ["standard", "mixed_sample"],
      required: false,
      default: "standard",
    },
    mixedContents: {
      type: [
        {
          productName: { type: String, required: true, trim: true },
          bottles: { type: Number, required: true, min: 1 },
        },
      ],
      default: [],
    },
    batchNo: { type: String, required: false, default: "" },
    componentBatches: {
      type: [
        {
          productName: { type: String, required: true, trim: true },
          batchNo: { type: String, required: false, default: "", trim: true },
        },
      ],
      required: false,
      default: [],
    },
    weight: { type: Number, required: false, default: null },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    city: { type: String, required: false, default: "", trim: true },
    deadlineDate: { type: Date, required: false, default: null },
    orderKind: {
      type: String,
      enum: ["standard", "mixed_sample", "hybrid"],
      required: false,
      default: "standard",
    },
    mixedSample: {
      type: MixedSampleSchema,
      required: false,
      default: null,
    },
    customCartons: {
      type: [CustomCartonSchema],
      required: false,
      default: [],
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      default: [],
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
    dispatchTripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchTrip",
      required: false,
      default: null,
      index: true,
    },
    adminEditedAt: { type: Date, required: false, default: null },
    adminEditedByName: { type: String, required: false, default: "", trim: true },
    gateDeliveryStatus: {
      type: String,
      enum: ["none", "out_for_delivery", "delivered", "pending_redelivery"],
      required: false,
      default: "none",
    },
    gateOutAt: { type: Date, required: false, default: null },
    gateDeliveredAt: { type: Date, required: false, default: null },
    gatePendingAt: { type: Date, required: false, default: null },
    gateUpdatedAt: { type: Date, required: false, default: null },
    gateUpdatedByUserId: { type: String, required: false, default: null },
    gateUpdatedByName: { type: String, required: false, default: "", trim: true },
    packagingDeductedAt: { type: Date, required: false, default: null },
    packagingDeductedByUserId: { type: String, required: false, default: null },
    packagingDeductedByName: { type: String, required: false, default: "", trim: true },
    packagingDeductionSummary: {
      type: [
        {
          itemCode: { type: String, required: true, trim: true, lowercase: true },
          itemName: { type: String, required: true, trim: true },
          quantity: { type: Number, required: true, min: 0 },
        },
      ],
      required: false,
      default: [],
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type OrderDoc = InferSchemaType<typeof OrderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Order =
  (mongoose.models.Order as mongoose.Model<OrderDoc>) ||
  mongoose.model<OrderDoc>("Order", OrderSchema);
