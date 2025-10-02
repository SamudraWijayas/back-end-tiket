import { Request, Response } from "express";
import EventAccessModel from "../models/eventAccess.model";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import { isValidObjectId } from "mongoose";

export default {
  // tambah staf/akses baru ke event
  async addAccess(req: IReqUser, res: Response) {
    try {
      const { eventId } = req.params;
      const { organizerId, role, permissions } = req.body;

      if (!isValidObjectId(eventId) || !isValidObjectId(organizerId)) {
        return response.error(res, null, "invalid id");
      }

      const result = await EventAccessModel.create({
        eventId,
        organizerId,
        role,
        permissions,
      });

      return response.success(res, result, "success add access to event");
    } catch (err) {
      return response.error(res, err, "failed add access");
    }
  },

  // update role/permissions
  async updateAccess(req: IReqUser, res: Response) {
    try {
      const { id } = req.params; // id dari EventAccess
      const { role, permissions } = req.body;

      const result = await EventAccessModel.findByIdAndUpdate(
        id,
        { role, permissions },
        { new: true }
      );

      if (!result) return response.notFound(res, "access not found");

      return response.success(res, result, "success update access");
    } catch (err) {
      return response.error(res, err, "failed update access");
    }
  },

  // hapus akses staf dari event
  async removeAccess(req: IReqUser, res: Response) {
    try {
      const { id } = req.params; // id dari EventAccess
      const result = await EventAccessModel.findByIdAndDelete(id);

      if (!result) return response.notFound(res, "access not found");

      return response.success(res, result, "success remove access");
    } catch (err) {
      return response.error(res, err, "failed remove access");
    }
  },

  // lihat semua akses di event
  async listAccess(req: IReqUser, res: Response) {
    try {
      const { eventId } = req.params;

      const result = await EventAccessModel.find({ eventId })
        .populate("organizerId", "fullName email role")
        .lean()
        .exec();

      return response.success(res, result, "success get event access list");
    } catch (err) {
      return response.error(res, err, "failed get access list");
    }
  },
};
