/** @format */

import { Router } from "express";
import {
  getCurrentUser,
  LoginController,
  RegistrationController,
  ResendVerificationController,
  VerificationController,
} from "../../controllers/users/auth/authController";
import validateToken from "../../middleware/validate-token";

const router = Router();
const registrationController = new RegistrationController();
const verificationController = new VerificationController();
const resendVerificationController = new ResendVerificationController();
const loginController = new LoginController();

router.post("/register", registrationController.register);
router.post("/verify-email", verificationController.verify);
router.post("/resend-email", resendVerificationController.resendEmail);
router.post("/login", loginController.login);
router.get("/me", validateToken, getCurrentUser);
export default router;
