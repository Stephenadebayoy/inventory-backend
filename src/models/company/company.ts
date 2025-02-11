/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  code: string;
}

const CompanySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", CompanySchema);
