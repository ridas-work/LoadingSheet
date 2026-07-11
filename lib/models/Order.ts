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
    /** Custom carton: container size code (5l-jar, 1l, …) or catalog. */
    bottleSizeCode: { type: String, required: false, default: "", trim: true, lowercase: true },
    /** Catalog packing code when line was picked from product list. */
    packingCode: { type: String, required: false, default: "", trim: true, lowercase: true },
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
    customBoxCode: { type: String, required: false, default: "", trim: true, lowercase: true },
  },
  { _id: false },
);

const SubtractedItemSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    boxes: { type: Number, required: true, min: 1 },
    bottlesPerBox: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "carried_out", "discarded"],
      required: true,
      default: "pending",
    },
    subtractedAt: { type: Date, required: true, default: () => new Date() },
    subtractedByName: { type: String, required: false, default: "", trim: true },
    batchNo: { type: String, required: false, default: "", trim: true },
    carriedOutAt: { type: Date, required: false, default: null },
    discardedAt: { type: Date, required: false, default: null },
    resolvedByName: { type: String, required: false, default: "", trim: true },
  },
  { _id: true },
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
    /** Rashid scale reading — physical carton mass in kg (validated vs standard list). */
    cartonWeightKg: { type: Number, required: false, default: null, min: 0 },
    customBoxCode: { type: String, required: false, default: "", trim: true, lowercase: true },
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
      enum: ["standard", "mixed_sample", "hybrid", "field_sample"],
      required: false,
      default: "standard",
    },
    /** Field visit sample dispatch — links back to the originating visit ticket. */
    fieldVisitTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldVisitTicket",
      required: false,
      default: null,
    },
    sampleRepName: { type: String, required: false, default: "", trim: true },
    /** Set when Rashid assigns sample batches and Esha sample pool is deducted. */
    sampleStockDeductedAt: { type: Date, required: false, default: null },
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
    /** Set when every standard carton row has a weight within ±8% tolerance. */
    weightsVerifiedAt: { type: Date, required: false, default: null },
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
    /** Whole PO voided by boss — hidden from active lists; not the same as subtracted-line discard. */
    discardedAt: { type: Date, required: false, default: null },
    discardedByUserId: { type: String, required: false, default: null },
    discardedByName: { type: String, required: false, default: "", trim: true },
    subtractedItems: {
      type: [SubtractedItemSchema],
      required: false,
      default: [],
    },
    /** When this PO was created automatically from boss-subtracted items. */
    subtractedFromOrderId: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      required: false,
      default: "approved",
    },
    approvalRequestedAt: { type: Date, required: false, default: null },
    approvedAt: { type: Date, required: false, default: null },
    approvedByUserId: { type: String, required: false, default: null },
    approvedByName: { type: String, required: false, default: "", trim: true },
    rejectedAt: { type: Date, required: false, default: null },
    rejectedByUserId: { type: String, required: false, default: null },
    rejectedByName: { type: String, required: false, default: "", trim: true },
    rejectionNote: { type: String, required: false, default: "", trim: true, maxlength: 500 },
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
    readyBottleDeductedAt: { type: Date, required: false, default: null },
    readyBottleDeductedByUserId: { type: String, required: false, default: null },
    readyBottleDeductedByName: { type: String, required: false, default: "", trim: true },
    readyBottleDeductionSummary: {
      type: [
        {
          productCode: { type: String, required: true, trim: true, lowercase: true },
          productName: { type: String, required: true, trim: true },
          bottles: { type: Number, required: true, min: 0 },
          lots: {
            type: [
              {
                batchNo: { type: String, required: true, trim: true },
                bottles: { type: Number, required: true, min: 0 },
              },
            ],
            required: false,
            default: [],
          },
        },
      ],
      required: false,
      default: [],
    },
    readyBottleRestoredAt: { type: Date, required: false, default: null },
    deliveryOutcome: {
      type: String,
      enum: ["full", "partial"],
      required: false,
      default: null,
    },
    orderClosedAt: { type: Date, required: false, default: null },
    orderClosedByUserId: { type: String, required: false, default: null },
    orderClosedByName: { type: String, required: false, default: "", trim: true },
    deliveryClosureLines: {
      type: [
        {
          productCode: { type: String, required: true, trim: true, lowercase: true },
          productName: { type: String, required: true, trim: true },
          dispatchedBottles: { type: Number, required: true, min: 0 },
          deliveredBottles: { type: Number, required: true, min: 0 },
          damagedBottles: { type: Number, required: true, min: 0 },
          returnedBottles: { type: Number, required: true, min: 0 },
        },
      ],
      required: false,
      default: [],
    },
    deliveryLateReturns: {
      type: [
        {
          note: { type: String, required: false, default: "", trim: true, maxlength: 500 },
          recordedAt: { type: Date, required: true },
          recordedByUserId: { type: String, required: false, default: null },
          recordedByName: { type: String, required: true, trim: true },
          lines: {
            type: [
              {
                productCode: { type: String, required: true, trim: true, lowercase: true },
                productName: { type: String, required: true, trim: true },
                damagedBottles: { type: Number, required: true, min: 0 },
                returnedBottles: { type: Number, required: true, min: 0 },
              },
            ],
            required: true,
            default: [],
          },
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
