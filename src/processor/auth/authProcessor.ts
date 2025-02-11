/** @format */

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { IUser } from "../../models/users/user";

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "none";

const generateTokens = (user: IUser) => {
  const { id, email, role, fullName, isVerified, mode, companyId } = user;
  return jwt.sign(
    { user: { id, fullName, email, role, mode, isVerified, companyId } },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1h",
    }
  );
};

export default generateTokens;
