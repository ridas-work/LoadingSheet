import mongoose, { type InferSchemaType } from "mongoose";

const DispatchTripSchema = new mongoose.Schema(
  {
    vehicleNo: { type: String, required: false, default: "" },
    driverName: { type: String, required: false, default: "" },
    dcNo: { type: String, required: false, default: "" },
    helperName: { type: String, required: false, default: "" },
    productionIncharge: { type: String, required: false, default: "" },
    securityName: { type: String, required: false, default: "" },
    driverSignature: { type: String, required: false, default: "" },
    orderIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
      default: [],
    },
    dispatchedAt: { type: Date, required: false, default: null },
    createdByUserId: { type: String, required: false, default: null },
    createdByName: { type: String, required: false, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type DispatchTripDoc = InferSchemaType<typeof DispatchTripSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DispatchTrip =
  (mongoose.models.DispatchTrip as mongoose.Model<DispatchTripDoc>) ||
  mongoose.model<DispatchTripDoc>("DispatchTrip", DispatchTripSchema);
