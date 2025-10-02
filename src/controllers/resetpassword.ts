import { Request, Response } from "express";
import response from "../utils/response";
import crypto from "crypto"; // Tambahkan ini di atas file
import UserModel, { resetPasswordDTO } from "../models/user.model";
import { encrypt } from "../utils/encryption";
import { CLIENT_HOST, EMAIL_SMTP_USER } from "../utils/env";
import { renderMailHtml, sendMail } from "../utils/mail/mail";

export default {
  // 1️⃣ Request reset password (kirim link ke email)
  async requestResetPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const user = await UserModel.findOne({ email });
      if (!user) return response.notFound(res, "User not found");

      // Generate token
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000); // 1 jam

      // Kirim email
      const resetLink = `${CLIENT_HOST}/auth/reset-password?token=${token}`;
      const html = await renderMailHtml("reset-password.ejs", {
        resetLink,
        fullName: user.fullName,
      });

      await sendMail({
        from: EMAIL_SMTP_USER,
        to: email,
        subject: "Reset Password",
        html,
      });

      response.success(res, null, "Reset password link sent to email");
    } catch (error) {
      response.error(res, error, "Failed to request reset password");
    }
  },

  // 2️⃣ Reset password dengan token
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password, confirmPassword } = req.body;

      // Validasi input
      await resetPasswordDTO.validate({ token, password, confirmPassword });

      const user = await UserModel.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) return response.notFound(res, "Invalid or expired token");

      // Update password & hapus token
      user.password = encrypt(password);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;

      response.success(res, null, "Password successfully updated");
    } catch (error) {
      response.error(res, error, "Failed to reset password");
    }
  },
};
