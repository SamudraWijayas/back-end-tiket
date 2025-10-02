import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import UserModel, { userAddDTO } from "../models/user.model";
import response from "../utils/response";
import { isValidObjectId } from "mongoose";

export default {
  async addUser(req: IReqUser, res: Response) {
    const { fullName, username, email, password, confirmPassword, role } =
      req.body;

    try {
      // validasi data pakai DTO khusus addUser
      await userAddDTO.validate({
        fullName,
        username,
        email,
        password,
        confirmPassword,
        role,
      });

      // cek apakah email/username sudah ada
      const existingUser = await UserModel.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        return response.conflict(res, "Email atau username sudah terdaftar");
      }

      // buat user baru
      const result = await UserModel.create({
        fullName,
        email,
        username,
        password,
        role,
      });

      response.success(res, result, "successfully added user!");
    } catch (error) {
      response.error(res, error, "failed to add user");
    }
  },
  async findAll(req: IReqUser, res: Response) {
    const {
      page = 1,
      limit = 10,
      search,
    } = req.query as unknown as IPaginationQuery;
    try {
      const query = {};

      if (search) {
        Object.assign(query, {
          $or: [
            {
              fullName: { $regex: search, $options: "i" },
            },
            {
              username: { $regex: search, $options: "i" },
            },
          ],
        });
      }

      const result = await UserModel.find(query)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .exec();

      const count = await UserModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          total: count,
          totalPages: Math.ceil(count / limit),
          current: page,
        },
        "success find all users"
      );
    } catch (error) {
      response.error(res, error, "failed find all users");
    }
  },
  async findOne(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "failed find one a ticket");
      }

      const result = await UserModel.findById(id);

      if (!result) {
        return response.notFound(res, "failed find one user");
      }

      response.success(res, result, "success find one user");
    } catch (error) {
      response.error(res, error, "failed find one user");
    }
  },
  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const { fullName, username, isActive } = req.body;

      // validasi ID
      if (!isValidObjectId(id)) {
        return response.notFound(res, "invalid user id");
      }

      const result = await UserModel.findByIdAndUpdate(
        id,
        {
          fullName,
          username,
          isActive,
        },
        { new: true }
      );

      if (!result) {
        return response.notFound(res, "user not found");
      }

      response.success(res, result, "success update user");
    } catch (error) {
      response.error(res, error, "failed to update user");
    }
  },
  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "failed remove a category");
      }

      const result = await UserModel.findByIdAndDelete(id, { new: true });
      response.success(res, result, "success remove user");
    } catch (error) {
      response.error(res, error, "failed remove user");
    }
  },
};
