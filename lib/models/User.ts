import mongoose, { type InferSchemaType } from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: "po_creator" },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User =
  (mongoose.models.User as mongoose.Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);

