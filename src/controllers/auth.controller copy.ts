import { Request, Response } from "express";
import * as Yup from "yup";

import UserModel, {
  userDTO,
  userLoginDTO,
  userUpdatePasswordDTO,
} from "../models/user.model";
import { encrypt } from "../utils/encryption";
import { generateToken } from "../utils/jwt";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default {
  async updateProfile(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      const { fullName, profilePicture } = req.body;
      const result = await UserModel.findByIdAndUpdate(
        userId,
        {
          fullName,
          profilePicture,
        },
        {
          new: true,
        }
      );

      if (!result) return response.notFound(res, "user not found");

      response.success(res, result, "success to update profile");
    } catch (error) {
      response.error(res, error, "failed to update profile");
    }
  },
  async updatePassword(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      const { oldPassword, password, confirmPassword } = req.body;

      await userUpdatePasswordDTO.validate({
        oldPassword,
        password,
        confirmPassword,
      });

      const user = await UserModel.findById(userId);

      if (!user || user.password !== encrypt(oldPassword))
        return response.notFound(res, "user not found");

      const result = await UserModel.findByIdAndUpdate(
        userId,
        {
          password: encrypt(password),
        },
        {
          new: true,
        }
      );
      response.success(res, result, "success to update password");
    } catch (error) {
      response.error(res, error, "failed to update password");
    }
  },

  async register(req: Request, res: Response) {
    const { fullName, username, email, password, confirmPassword } = req.body;

    try {
      await userDTO.validate({
        fullName,
        username,
        email,
        password,
        confirmPassword,
      });

      const result = await UserModel.create({
        fullName,
        email,
        username,
        password,
        isActive: true,
      });

      response.success(res, result, "success registration!");
    } catch (error) {
      response.error(res, error, "failed registration");
    }
  },
  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;
      await userLoginDTO.validate({
        identifier,
        password,
      });

      const userByIdentifier = await UserModel.findOne({
        $or: [
          {
            email: identifier,
          },
          {
            username: identifier,
          },
        ],
        isActive: true,
      });

      if (!userByIdentifier) {
        return response.unauthorized(res, "user not found");
      }

      // validasi password
      const validatePassword: boolean =
        encrypt(password) === userByIdentifier.password;

      if (!validatePassword) {
        return response.unauthorized(res, "user not found");
      }

      const token = generateToken({
        id: userByIdentifier._id,
        role: userByIdentifier.role,
      });

      response.success(res, token, "login success");
    } catch (error) {
      response.error(res, error, "login failed");
    }
  },

  async loginWithGoogle(req: Request, res: Response) {
    try {
      const { access_token } = req.body;

      // Verifikasi token Google
      const ticket = await client.verifyIdToken({
        idToken: access_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email)
        return response.unauthorized(res, "Email tidak tersedia dari Google");

      const { email, name, picture } = payload;

      // Cek user di DB
      let user = await UserModel.findOne({ email });

      if (!user) {
        let usernameBase = email.split("@")[0];
        let username = usernameBase;
        let counter = 1;

        while (await UserModel.findOne({ username })) {
          username = `${usernameBase}${counter}`;
          counter++;
        }

        // Hash dummy password

        user = await UserModel.create({
          email,
          fullName: name || "No Name",
          username,
          password: "Tiket_1234",
          profilePicture: picture || "",
          isActive: true,
          role: "member",
        });
      }

      // Generate JWT
      const token = generateToken({
        id: user._id,
        role: user.role,
      });

      return response.success(
        res,
        { token, user },
        "Login with Google success"
      );
    } catch (err) {
      console.error("Google login error:", err);
      return response.error(res, err, "Google login failed");
    }
  },

  async me(req: IReqUser, res: Response) {
    try {
      const user = req.user;
      const result = await UserModel.findById(user?.id);

      response.success(res, result, "success get user profile");
    } catch (error) {
      response.error(res, error, "failed get user profile");
    }
  },
  async activation(req: Request, res: Response) {
    try {
      const { code } = req.body as { code: string };

      const user = await UserModel.findOneAndUpdate(
        {
          activationCode: code,
        },
        {
          isActive: true,
        },
        {
          new: true,
        }
      );

      response.success(res, user, "user successfully activated");
    } catch (error) {
      response.error(res, error, "user is failed activated");
    }
  },
};
