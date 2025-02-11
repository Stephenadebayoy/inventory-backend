/** @format */
import nodemailer from "nodemailer";

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: process.env.EMAIL_USER as string,
      pass: process.env.PASSWORD as string,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your email",
    text: `Your verification code is: ${token}`,
    html: `<p>Your verification code is: <strong>${token}</strong></p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", info.messageId);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}
