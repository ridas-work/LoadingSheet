import mongoose, { type InferSchemaType } from "mongoose";

const DutyAssignmentSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: false, default: "", trim: true },
    employeeIds: { type: [String], required: false, default: [] },
    employeeNames: { type: String, required: false, default: "", trim: true },
  },
  { _id: false },
);

const WorkRowSchema = new mongoose.Schema(
  {
    lineKey: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    productCode: { type: String, required: false, default: "", trim: true },
    taskCode: { type: String, required: false, default: "", trim: true },
    duty: { type: String, required: true, trim: true },
    baseTarget: { type: Number, required: true, default: 0, min: 0 },
    carryIn: { type: Number, required: true, default: 0, min: 0 },
    effectiveTarget: { type: Number, required: true, default: 0, min: 0 },
    statusAchieved: { type: Number, required: true, default: 0, min: 0 },
    carryOut: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const RashidDailyPlanSchema = new mongoose.Schema(
  {
    planDate: { type: Date, required: true },
    helperEmployeeId: { type: String, required: false, default: "", trim: true },
    helperName: { type: String, required: false, default: "", trim: true },
    workRows: { type: [WorkRowSchema], required: true, default: [] },
    duties: {
      boxMaking: { type: DutyAssignmentSchema, required: false, default: () => ({}) },
      machineCleaning: { type: DutyAssignmentSchema, required: false, default: () => ({}) },
      hallOrganization: { type: DutyAssignmentSchema, required: false, default: () => ({}) },
    },
    dayStatus: {
      type: String,
      enum: ["planned", "closed"],
      required: false,
      default: "planned",
    },
    statusRecordedAt: { type: Date, required: false, default: null },
    statusRecordedByName: { type: String, required: false, default: "", trim: true },
    recordedByUserId: { type: String, required: false, default: null },
    recordedByName: { type: String, required: false, default: "", trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

RashidDailyPlanSchema.index({ planDate: 1 }, { unique: true });

export type RashidDailyPlanDoc = InferSchemaType<typeof RashidDailyPlanSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RashidDailyPlan =
  (mongoose.models.RashidDailyPlan as mongoose.Model<RashidDailyPlanDoc>) ||
  mongoose.model<RashidDailyPlanDoc>("RashidDailyPlan", RashidDailyPlanSchema);
