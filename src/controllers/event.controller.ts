import { Response } from "express";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import EventModel, { eventDTO, TypeEvent } from "../models/event.model";
import { FilterQuery, isValidObjectId } from "mongoose";
import uploader from "../utils/uploader";

export default {
  async create(req: IReqUser, res: Response) {
    try {
      const payload = { ...req.body, createdBy: req.user?.id } as TypeEvent;
      await eventDTO.validate(payload);
      const result = await EventModel.create(payload); // hook post("save") akan jalan otomatis
      response.success(
        res,
        result,
        "success create an event & notification sent"
      );
    } catch (error) {
      response.error(res, error, "failed to create an event");
    }
  },
  async findAll(req: IReqUser, res: Response) {
    try {
      const buildQuery = (filter: any) => {
        let query: FilterQuery<TypeEvent> = {};

        if (filter.search) query.$text = { $search: filter.search };
        if (filter.category) query.category = filter.category;
        if (filter.isOnline) query.isOnline = filter.isOnline;
        if (filter.isPublish) query.isPublish = filter.isPublish;
        if (filter.isFeatured) query.isFeatured = filter.isFeatured;

        return query;
      };

      const {
        limit = 10,
        page = 1,
        search,
        category,
        isOnline,
        isFeatured,
        isPublish,
      } = req.query;

      const query = buildQuery({
        search,
        category,
        isPublish,
        isFeatured,
        isOnline,
      });

      const result = await EventModel.find(query)
        .populate("createdBy", "fullName")
        .limit(+limit)
        .skip((+page - 1) * +limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      const count = await EventModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          current: +page,
          total: count,
          totalPages: Math.ceil(count / +limit),
        },
        "success find all events"
      );
    } catch (error) {
      response.error(res, error, "failed find all events");
    }
  },
  async findOne(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "failed find one a ticket");
      }

      const result = await EventModel.findById(id).populate(
        "createdBy",
        "fullName"
      );

      if (!result) {
        return response.notFound(res, "failed find one a event");
      }

      response.success(res, result, "success find one event");
    } catch (error) {
      response.error(res, error, "failed find one event");
    }
  },
  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const result = await EventModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });

      if (!result) return response.notFound(res, "event not found");

      response.success(res, result, "success update an event");
    } catch (error) {
      response.error(res, error, "failed update an event");
    }
  },
  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const result = await EventModel.findByIdAndDelete(id, {
        new: true,
      });

      if (!result) return response.notFound(res, "event not found");

      await uploader.remove(result.banner);

      response.success(res, result, "success remove an event");
    } catch (error) {
      response.error(res, error, "failed to remove an event");
    }
  },
  async findOneBySlug(req: IReqUser, res: Response) {
    try {
      const { slug } = req.params;

      const result = await EventModel.findOne({ slug })
        .populate("createdBy", "fullName") // pilih field creator
        .lean()
        .exec();

      if (!result) {
        return response.notFound(res, "event not found");
      }

      return response.success(res, result, "success find one by slug an event");
    } catch (error) {
      return response.error(res, error, "failed find one by slug an event");
    }
  },
  async findEventByOrganizer(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;

      const query: FilterQuery<TypeEvent> = {
        createdBy: userId,
      };

      const result = await EventModel.find(query)
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      response.success(res, result, "success find all events");
    } catch (error) {
      response.error(res, error, "failed find all events");
    }
  },
  async findAllByOrganizer(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      const buildQuery = (filter: any) => {
        let query: FilterQuery<TypeEvent> = {
          createdBy: userId,
        };

        if (filter.search) query.$text = { $search: filter.search };

        return query;
      };

      const { limit = 10, page = 1, search } = req.query;

      const query = buildQuery({
        search,
      });

      const result = await EventModel.find(query)
        .populate("createdBy", "fullName")
        .limit(+limit)
        .skip((+page - 1) * +limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      const count = await EventModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          current: +page,
          total: count,
          totalPages: Math.ceil(count / +limit),
        },
        "success find all events"
      );
    } catch (error) {
      response.error(res, error, "failed find all events");
    }
  },
  async TotalEventByOrganizer(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return response.error(res, null, "user not found");

      // hitung semua event oleh organizer
      const total = await EventModel.countDocuments({ createdBy: userId });

      response.success(res, { total }, "success get total events by organizer");
    } catch (error) {
      response.error(res, error, "failed to get total events by organizer");
    }
  },
  async findAllNoLimit(req: IReqUser, res: Response) {
    try {
      const buildQuery = (filter: any) => {
        let query: FilterQuery<TypeEvent> = {};

        if (filter.search) query.$text = { $search: filter.search };
        if (filter.category) query.category = filter.category;
        if (filter.isOnline) query.isOnline = filter.isOnline;
        if (filter.isPublish) query.isPublish = filter.isPublish;
        if (filter.isFeatured) query.isFeatured = filter.isFeatured;

        return query;
      };

      const { search, category, isOnline, isFeatured, isPublish } = req.query;

      const query = buildQuery({
        search,
        category,
        isPublish,
        isFeatured,
        isOnline,
      });

      const result = await EventModel.find(query)
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const count = await EventModel.countDocuments(query);

      response.sukses(
        res,
        result,
        {
          total: count,
        },
        "success find all events"
      );
    } catch (error) {
      response.error(res, error, "failed find all events");
    }
  },
};
