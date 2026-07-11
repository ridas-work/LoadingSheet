import mongoose, { type InferSchemaType } from "mongoose";

const CustomerAccountContactSchema = new mongoose.Schema(
  {
    contactPerson: { type: String, required: true, trim: true },
    designation: { type: String, required: false, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: false, default: "", trim: true },
  },
  { _id: false },
);

const CustomerAccountSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    /** Link to the slim CustomerDirectory row used by PO / field visit dropdowns. */
    directoryCode: { type: String, required: false, default: "", trim: true, lowercase: true },

    taxStatus: {
      type: String,
      enum: ["filer", "non_filer"],
      required: true,
      default: "non_filer",
    },
    ntn: { type: String, required: false, default: "", trim: true },
    strn: { type: String, required: false, default: "", trim: true },

    contractStatus: {
      type: String,
      enum: ["contract", "non_contract"],
      required: true,
      default: "non_contract",
    },
    contractDescription: { type: String, required: false, default: "", trim: true, maxlength: 2000 },

    address: { type: String, required: false, default: "", trim: true },
    city: { type: String, required: false, default: "", trim: true },
    contactPerson: { type: String, required: false, default: "", trim: true },
    designation: { type: String, required: false, default: "", trim: true },
    email: { type: String, required: false, default: "", trim: true },
    phone: { type: String, required: false, default: "", trim: true },
    contacts: {
      type: [CustomerAccountContactSchema],
      required: false,
      default: [],
    },
    notes: { type: String, required: false, default: "", trim: true, maxlength: 2000 },

    active: { type: Boolean, required: false, default: true },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "blocked"],
      required: true,
      default: "pending",
    },
    reviewedByName: { type: String, required: false, default: "", trim: true },
    reviewedAt: { type: Date, required: false, default: null },
    createdByUserId: { type: String, required: false, default: null },
    createdByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

CustomerAccountSchema.index({ companyName: 1 });
CustomerAccountSchema.index({ directoryCode: 1 });
CustomerAccountSchema.index({ approvalStatus: 1, createdAt: -1 });
CustomerAccountSchema.index({ createdAt: -1 });

export type CustomerAccountDoc = InferSchemaType<typeof CustomerAccountSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (mongoose.models.CustomerAccount) {
  delete mongoose.models.CustomerAccount;
}

export const CustomerAccount =
  mongoose.model<CustomerAccountDoc>("CustomerAccount", CustomerAccountSchema);
