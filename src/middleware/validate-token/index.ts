/** @format */

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

interface DecodedToken extends JwtPayload {
  user: {
    id:string;
    fullName: string;
    email: string;
    password: string;
    mode: "personal" | "inventory";
    role: "user" | "admin" | "employee";
    companyId?: mongoose.Types.ObjectId;
    isVerified?: boolean;
    verificationToken?: string;
  };
}

declare module "express" {
  interface Request {
    user?: DecodedToken["user"];
  }
}

const validateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer")) {
    res.status(401).json({ message: "User not authorized or token missing" });
    return;
  }

  token = authHeader.split(" ")[1];
  if (!token) {
    res
      .status(401)
      .json({ message: "User is not authorized or missing token" });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as DecodedToken;
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: "User not authorized!" });
  }
};

export default validateToken;
