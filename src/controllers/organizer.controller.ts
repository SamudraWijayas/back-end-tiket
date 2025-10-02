import { Request, Response } from "express";
import OrganizerModel, {
  organizerDTO,
  organizerLoginDTO,
  organizerUpdatePasswordDTO,
} from "../models/organizer.model";
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
      const result = await OrganizerModel.findByIdAndUpdate(
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

      await organizerUpdatePasswordDTO.validate({
        oldPassword,
        password,
        confirmPassword,
      });

      const user = await OrganizerModel.findById(userId);

      if (!user || user.password !== encrypt(oldPassword))
        return response.notFound(res, "user not found");

      const result = await OrganizerModel.findByIdAndUpdate(
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
      await organizerDTO.validate({
        fullName,
        username,
        email,
        password,
        confirmPassword,
      });

      const result = await OrganizerModel.create({
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
      await organizerLoginDTO.validate({
        identifier,
        password,
      });

      const userByIdentifier = await OrganizerModel.findOne({
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

  async me(req: IReqUser, res: Response) {
    try {
      const user = req.user;
      const result = await OrganizerModel.findById(user?.id);

      response.success(res, result, "success get user profile");
    } catch (error) {
      response.error(res, error, "failed get user profile");
    }
  },
  async activation(req: Request, res: Response) {
    try {
      const { code } = req.body as { code: string };

      const user = await OrganizerModel.findOneAndUpdate(
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
