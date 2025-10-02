import { Response } from "express";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import OrderModel, { OrderStatus } from "../models/order.model";
import mongoose from "mongoose";

export default {
  async salesStats(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return response.error(res, null, "user not found");

      // ambil semua completed order tanpa default 7 hari
      const result = (await OrderModel.find({
        status: OrderStatus.COMPLETED,
      })
        .populate({
          path: "events",
          match: { createdBy: userId },
          select: "name createdBy",
        })
        .lean()
        .exec()) as any[];

      // filter hanya order yang event-nya punya user ini
      const filtered = result.filter((order) => order.events !== null);

      // group per bulan
      const grouped: Record<
        string,
        { totalIncome: number; totalOrders: number }
      > = {};
      for (const order of filtered) {
        const date = new Date(order.createdAt);
        const month = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`; // YYYY-MM
        if (!grouped[month])
          grouped[month] = { totalIncome: 0, totalOrders: 0 };
        grouped[month].totalIncome += order.total || 0;
        grouped[month].totalOrders += 1;
      }

      const stats = Object.entries(grouped).map(([month, val]) => ({
        month,
        ...val,
      }));

      // optional: urutkan bulan ascending
      stats.sort((a, b) => (a.month > b.month ? 1 : -1));

      response.success(res, stats, "success get sales stats for all months");
    } catch (error) {
      response.error(res, error, "failed to get sales stats");
    }
  },
  async ticketStats(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return response.error(res, null, "user not found");

      const result = await OrderModel.aggregate([
        { $match: { status: OrderStatus.COMPLETED } },
        {
          $lookup: {
            from: "events",
            localField: "events",
            foreignField: "_id",
            as: "events",
          },
        },
        { $unwind: { path: "$events", preserveNullAndEmptyArrays: false } },
        { $match: { "events.createdBy": new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: "tickets",
            localField: "ticket",
            foreignField: "_id",
            as: "ticket",
          },
        },
        { $unwind: { path: "$ticket", preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: "$ticket._id",
            ticketName: { $first: "$ticket.name" },
            sold: { $sum: "$quantity" },
            totalIncome: { $sum: "$total" },
          },
        },
        { $sort: { sold: -1 } },
      ]);

      response.success(res, result, "success get ticket stats");
    } catch (error) {
      response.error(res, error, "failed to get ticket stats");
    }
  },
  async totalIncomeByOrganizer(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;

      const result = await OrderModel.find({ status: "completed" })
        .populate({
          path: "events",
          match: { createdBy: userId },
          select: "name createdBy",
        })
        .lean()
        .exec();

      const filtered = result.filter((order) => order.events !== null);

      const totalIncome = filtered.reduce(
        (acc, order) => acc + (order.total || 0),
        0
      );

      response.success(
        res,
        {
          totalOrders: filtered.length,
          totalIncome,
        },
        "success find income by event organizer"
      );
    } catch (error) {
      response.error(res, error, "failed find income by event organizer");
    }
  },
  async incomeTodayByEventOrganizer(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;

      // Ambil awal & akhir hari ini (jam 00:00:00 s/d 23:59:59)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const result = await OrderModel.find({
        status: "completed",
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
        .populate({
          path: "events",
          match: { createdBy: userId },
          select: "name createdBy",
        })
        .lean()
        .exec();

      const filtered = result.filter((order) => order.events !== null);

      const totalIncome = filtered.reduce(
        (acc, order) => acc + (order.total || 0),
        0
      );

      response.success(
        res,
        {
          totalOrders: filtered.length,
          totalIncome,
        },
        "success find today's income by event owner"
      );
    } catch (error) {
      response.error(res, error, "failed find today's income by event owner");
    }
  },
  async totalOrderTicketByEvent(req: IReqUser, res: Response) {
    try {
      const { eventId } = req.params;

      if (!eventId) return response.error(res, null, "eventId is required");

      const result = await OrderModel.aggregate([
        {
          $match: {
            status: OrderStatus.COMPLETED, // cuma completed
            events: new mongoose.Types.ObjectId(eventId),
          },
        },
        {
          $lookup: {
            from: "tickets", // ambil data tiket
            localField: "ticket",
            foreignField: "_id",
            as: "ticketData",
          },
        },
        { $unwind: "$ticketData" },
        {
          $group: {
            _id: "$ticket", // grup per tiket
            totalOrders: { $sum: "$quantity" }, // jumlah tiket terjual
            totalAmount: { $sum: "$total" }, // total uang dari tiket itu
            eventId: { $first: "$events" },
            ticketName: { $first: "$ticketData.name" },
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "eventData",
          },
        },
        { $unwind: "$eventData" },
        {
          $project: {
            _id: 0,
            eventId: "$eventData._id",
            eventName: "$eventData.name",
            ticketId: "$_id",
            ticketName: 1,
            totalOrders: 1,
            totalAmount: 1,
          },
        },
      ]);

      if (result.length === 0) {
        return response.success(
          res,
          [],
          "no completed orders found for this event"
        );
      }

      response.success(res, result, "success total for completed orders");
    } catch (error) {
      response.error(res, error, "failed to get order counts for event");
    }
  },
  async totalOrderByEventd(req: IReqUser, res: Response) {
    try {
      const { eventId } = req.params;

      if (!eventId) return response.error(res, null, "eventId is required");

      const result = await OrderModel.aggregate([
        {
          $match: {
            events: new mongoose.Types.ObjectId(eventId),
            status: "completed", // hanya ambil yang completed
          },
        },
        {
          $group: {
            _id: "$events",
            totalAmount: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "eventData",
          },
        },
        { $unwind: "$eventData" },
        {
          $project: {
            _id: 0,
            eventId: "$eventData._id",
            eventName: "$eventData.name",
            totalAmount: 1,
          },
        },
      ]);

      if (result.length === 0)
        return response.success(
          res,
          { totalAmount: 0 },
          "no completed orders found for this event"
        );

      response.success(res, result[0], "success total for completed orders");
    } catch (error) {
      response.error(res, error, "failed to get total for event");
    }
  },
  async totalEvent(req: IReqUser, res: Response) {
    try {
      // ambil semua order yang completed
      const result = await OrderModel.aggregate([
        {
          $match: {
            status: "completed", // hanya yang completed
          },
        },
        {
          $group: {
            _id: "$events", // grup per event
            totalOrders: { $sum: 1 }, // jumlahkan order per event
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "eventData",
          },
        },
        { $unwind: "$eventData" },
        {
          $project: {
            _id: 0,
            eventId: "$eventData._id",
            eventName: "$eventData.name",
            totalOrders: 1, // jumlah order per event
          },
        },
      ]);

      if (result.length === 0)
        return response.success(
          res,
          [],
          "no completed orders found for any event"
        );

      response.success(
        res,
        result,
        "success count of completed orders per event"
      );
    } catch (error) {
      response.error(res, error, "failed to get order counts for events");
    }
  },
  async totalEventByIdEvent(req: IReqUser, res: Response) {
    try {
      const { eventId } = req.params;

      if (!eventId) return response.error(res, null, "eventId is required");

      // ambil semua order yang completed untuk event tertentu
      const result = await OrderModel.aggregate([
        {
          $match: {
            status: "completed", // hanya yang completed
            events: new mongoose.Types.ObjectId(eventId), // filter by eventId
          },
        },
        {
          $group: {
            _id: "$events", // grup per event
            totalOrders: { $sum: 1 }, // jumlahkan order per event
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "eventData",
          },
        },
        { $unwind: "$eventData" },
        {
          $project: {
            _id: 0,
            eventId: "$eventData._id",
            eventName: "$eventData.name",
            totalOrders: 1, // jumlah order per event
          },
        },
      ]);

      if (result.length === 0)
        return response.success(
          res,
          [],
          "no completed orders found for this event"
        );

      response.success(
        res,
        result[0],
        "success count of completed orders for this event"
      );
    } catch (error) {
      response.error(res, error, "failed to get order counts for event");
    }
  },
  async totalByAdmin(req: IReqUser, res: Response) {
    try {
      // aggregate total order per event untuk semua event, hanya yang completed
      const result = await OrderModel.aggregate([
        {
          $match: {
            status: "completed", // hanya yang completed
          },
        },
        {
          $group: {
            _id: "$events",
            totalAmount: { $sum: "$total" }, // jumlahkan total per event
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "eventData",
          },
        },
        { $unwind: "$eventData" },
        {
          $project: {
            _id: 0,
            eventId: "$eventData._id",
            eventName: "$eventData.name",
            totalAmount: 1,
          },
        },
      ]);

      if (result.length === 0)
        return response.success(
          res,
          [],
          "no completed orders found for any event"
        );

      response.success(
        res,
        result,
        "success total for completed orders per event"
      );
    } catch (error) {
      response.error(res, error, "failed to get total for events");
    }
  },
};
