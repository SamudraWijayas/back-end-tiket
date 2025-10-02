import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import LineupModel, { lineupDTO, TypeLineup } from "../models/lineup.model";
import { FilterQuery, isValidObjectId } from "mongoose";

export default {
  async create(req: IReqUser, res: Response) {
    try {
      await lineupDTO.validate(req.body);
      const result = await LineupModel.create(req.body);
      response.success(res, result, "success create a lineup");
    } catch (error) {
      response.error(res, error, "failed to create a lineup");
    }
  },
  async findAll(req: IReqUser, res: Response) {
    try {
      const {
        limit = 10,
        page = 1,
        search,
      } = req.query as unknown as IPaginationQuery;

      const query: FilterQuery<TypeLineup> = {};

      if (search) {
        Object.assign(query, {
          ...query,
          $text: {
            $search: search,
          },
        });
      }

      const result = await LineupModel.find(query)
        .populate("events")
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .exec();
      const count = await LineupModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          total: count,
          current: page,
          totalPages: Math.ceil(count / limit),
        },
        "success find all lineups"
      );
    } catch (error) {
      response.error(res, error, "failed to find all lineup");
    }
  },
  async findOne(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "failed find one a lineup");
      }

      const result = await LineupModel.findById(id);

      if (!result) {
        return response.notFound(res, "failed find one a lineup");
      }

      response.success(res, result, "success find one a lineup");
    } catch (error) {
      response.error(res, error, "failed to find one a lineup");
    }
  },
  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "failed update a lineup");
      }

      const result = await LineupModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      response.success(res, result, "success update a lineup");
    } catch (error) {
      response.error(res, error, "failed to update lineup");
    }
  },
  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "failed remove a lineup");
      }

      const result = await LineupModel.findByIdAndDelete(id, {
        new: true,
      });
      response.success(res, result, "success remove a lineup");
    } catch (error) {
      response.error(res, error, "failed to remove lineup");
    }
  },
  async findAllByLineup(req: IReqUser, res: Response) {
    try {
      const { eventId } = req.params;

      if (!isValidObjectId(eventId)) {
        return response.error(res, null, "lineups not found");
      }

      const result = await LineupModel.find({ events: eventId }).exec();
      response.success(res, result, "success find all lineups by an event");
    } catch (error) {
      response.error(res, error, "failed to find all lineup by event");
    }
  },
  async updateStatus(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "invalid lineup id");
      }

      if (typeof isActive !== "boolean") {
        return response.error(res, null, "isActive must be a boolean");
      }

      const result = await LineupModel.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      );

      if (!result) {
        return response.notFound(res, "lineup not found");
      }

      response.success(res, result, "success update lineup status");
    } catch (error) {
      response.error(res, error, "failed to update lineup status");
    }
  },
};
