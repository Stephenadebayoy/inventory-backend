/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  mode: "personal" | "inventory";
  role: "user" | "admin" | "employee";
  companyId?: mongoose.Types.ObjectId;
  isVerified?: boolean;
  verificationToken?: string;
}

const UserSchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mode: { type: String, enum: ["personal", "inventory"], required: true },
    role: {
      type: String,
      enum: ["user", "admin", "employee"],
      required: true,
    },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", default: null },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
