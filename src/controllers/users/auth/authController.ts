/** @format */

import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { generateCompanyCode } from "../../../utils/generateCompanyCode";
import { Company, Invitation, User } from "../../../models";
import mongoose from "mongoose";
import { sendVerificationEmail } from "../../../utils/emailSender";
import generateTokens from "../../../processor/auth/authProcessor";

export class RegistrationController {
  public async register(req: Request, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        fullName,
        email,
        password,
        mode,
        role,
        companyName,
        invitationCode,
      } = req.body;

      // Validate required fields
      const missingFields = ["fullName", "email", "password", "mode"].filter(
        (field) => !req.body[field]
      );
      if (mode === "inventory") {
        if (!role) missingFields.push("role");
        if (role === "admin" && !companyName) missingFields.push("companyName");
        if (role === "employee" && !invitationCode)
          missingFields.push("invitationCode");
      }
      if (missingFields.length) {
        res
          .status(400)
          .json({ error: `Missing fields: ${missingFields.join(", ")}` });
        return;
      }

      // Check if email exists
      const existingUser = await User.findOne({ email }).session(session);
      if (existingUser) {
        res.status(400).json({ error: "Email is already in use." });
        return;
      }

      // Hash password and set defaults
      const hashedPassword = await bcrypt.hash(password, 10);
      let userRole: "user" | "admin" | "employee" = role || "user";
      let companyId = null;

      // Handle company logic for inventory mode
      if (mode === "inventory" && role === "admin") {
        const companyCode = await generateCompanyCode(companyName);
        const company = await Company.findOne({ code: companyCode }).session(
          session
        );

        if (company) {
          const existingAdmin = await User.findOne({
            role: "admin",
            companyId: company._id,
          }).session(session);
          if (existingAdmin) {
            res
              .status(400)
              .json({ error: "An admin already exists for this company." });
            return;
          }
          companyId = company._id;
        } else {
          const newCompany = await Company.create(
            [{ name: companyName, code: companyCode }],
            { session }
          );
          companyId = newCompany[0]._id;
        }
      } else if (mode === "inventory" && role === "employee") {
        const invitation = await Invitation.findOne({
          code: invitationCode,
        }).session(session);
        if (!invitation || new Date() > invitation.expiresAt) {
          res
            .status(400)
            .json({ error: "Invalid or expired invitation code." });
          return;
        }
        companyId = invitation.companyId;
      }

      // Create user and send verification email
      const verificationToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      await new User({
        fullName,
        email,
        password: hashedPassword,
        mode,
        role: userRole,
        companyId,
        isVerified: false,
        verificationToken,
      }).save({ session });

      if (mode === "inventory" && role === "employee") {
        await Invitation.findOneAndUpdate(
          { code: invitationCode },
          { $inc: { usageCount: 1 } },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
      await sendVerificationEmail(email, verificationToken);

      res.status(201).json({ message: "Registration successful" });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Server error", details: error.message });
    }
  }
}

export class VerificationController {
  public async verify(req: Request, res: Response): Promise<void> {
    try {
      const { email, verificationToken } = req.body;
      if (!email || !verificationToken) {
        res.status(400).json({ error: "Email and token are required." });
        return;
      }
      const user = await User.findOne({ email, verificationToken });
      if (!user) {
        res.status(400).json({ error: "Invalid verification details." });
        return;
      }
      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();
      res.status(200).json({ message: "Email verified successfully." });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
}

export class ResendVerificationController {
  public async resendEmail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.body || Object.keys(req.body).length !== 1 || !req.body.email) {
        res.status(400).json({ error: "Only 'email' field is allowed." });
        return;
      }
      const email = req.body.email.toLowerCase();
      const user = await User.findOne({ email });
      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }
      if (user.isVerified) {
        res.status(400).json({ error: "User is already verified." });
        return;
      }
      const verificationToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      user.verificationToken = verificationToken;
      await user.save();
      await sendVerificationEmail(email, verificationToken);
      res.status(200).json({ message: "Verification token re-sent to email." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
}

export class LoginController {
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user?.isVerified){
        res.status(401).json({ message: "User havent been verified" });
        return;
      }
      if (!user || !(await bcrypt.compare(password, user.password))) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      const token = generateTokens(user);
      res.status(200).json({ accessToken: token });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
}
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id)
      .populate("companyId", "name code createdAt") 
      .select("-password -verificationToken -__v") 
      .lean();

    if (!user) {
      res.status(401).json({ message: "Unauthorized: User not found" });
      return;
    }

    res.status(200).json({
      user,
      company: user.companyId ? user.companyId : null, 
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Error fetching user details" });
  }
};


export class UserController {
  public async getAllUsers(req: Request, res: Response): Promise<void> {
    const {  email, fullName,mode } = req.query;
    let filter: any = {};
    if (email) filter.email = email;
    if (fullName) filter.fullName = { $regex: fullName, $options: "i" }; 
    if (mode) filter.mode = mode;

    try {
      const users = await User.find(filter)
        .select("-password -verificationToken -__v") 
        .populate("companyId", "name code createdAt") 
        .lean(); 
  
      res.status(200).json({ users });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  
  
}
