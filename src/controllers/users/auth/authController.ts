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

      if (!fullName || !email || !password || !mode) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }
      const existingUser = await User.findOne({ email }).session(session);
      if (existingUser) {
        res.status(400).json({ error: "Email is already in use." });
        return;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      let userRole: "user" | "admin" | "employee" = "user";
      let companyId = null;

      if (mode === "inventory") {
        if (!role) {
          res
            .status(400)
            .json({ error: "Role is required for inventory registration" });
          return;
        }
        userRole = role;
        if (role === "admin") {
          if (!companyName) {
            res.status(400).json({
              error: "Company name is required for admin registration",
            });
            return;
          }
          const companyCode = await generateCompanyCode(companyName);
          let company = await Company.findOne({ code: companyCode }).session(
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
              [
                {
                  name: companyName,
                  code: companyCode,
                },
              ],
              { session }
            );
            companyId = newCompany[0]._id;
          }
        } else if (role === "employee") {
          if (!invitationCode) {
            res.status(400).json({
              error: "Invitation code is required for employee registration",
            });
            return;
          }
          const invitation = await Invitation.findOne({
            code: invitationCode,
          }).session(session);
          if (!invitation) {
            res.status(400).json({ error: "Invalid invitation code" });
            return;
          }
          if (new Date() > invitation.expiresAt) {
            res.status(400).json({ error: "Invitation code has expired" });
            return;
          }
          companyId = invitation.companyId;
        }
      }
      const verificationToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      const newUser = new User({
        fullName,
        email,
        password: hashedPassword,
        mode, // "personal" or "inventory"
        role: userRole,
        companyId,
        isVerified: false,
        verificationToken,
      });
      await newUser.save({ session });

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
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Registration error:", error);
      res.status(500).json({ error: "Server error" });
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
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required." });
        return;
      }
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
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const company = await Company.findById(user.companyId);
  try {
    res.status(200).json({
      user: user,
      code: company ? company.code : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching user details" });
  }
};
