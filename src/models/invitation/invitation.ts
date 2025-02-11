/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IInvitation extends Document {
  code: string;
  companyId: mongoose.Types.ObjectId;
  expiresAt: Date;
  usageCount: number;
  maxUsage: number;
}

const InvitationSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    expiresAt: { type: Date, required: true },
    usageCount: { type: Number, default: 0 },
    maxUsage: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.model<IInvitation>("Invitation", InvitationSchema);
