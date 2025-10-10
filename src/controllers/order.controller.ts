import { Request, Response } from "express";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import OrderModel, {
  orderDTO,
  OrderStatus,
  TypeOrder,
  TypeVoucher,
} from "../models/order.model";
import TicketModel from "../models/ticket.model";
import mongoose, { FilterQuery, isValidObjectId } from "mongoose";
import { getId } from "../utils/id";
import EventModel from "../models/event.model";
import VoucherModel from "../models/voucher.model";
import BarcodeModel from "../models/barcode.model";
import WalletTransactionModel from "../models/walletTransaction.model";
import WalletModel from "../models/wallet.model";

interface NotificationBody {
  order_id: string;
  transaction_status:
    | "capture"
    | "settlement"
    | "pending"
    | "deny"
    | "cancel"
    | "expire";
}

export default {
  // src/controllers/order.controller.ts (hanya create method)
  async create(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      // terima payload dari body
      const payload = {
        ...req.body,
        createdBy: userId,
      } as TypeOrder;

      // validasi payload (orderDTO sekarang menerima voucher optional)
      await orderDTO.validate(payload);

      // ambil ticket & event
      const ticket = await TicketModel.findById(payload.ticket);
      if (!ticket) return response.notFound(res, "ticket not found");

      const event = await EventModel.findById(payload.events);
      if (!event) return response.notFound(res, "event not found");

      // Pastikan quantity cukup
      const availableQty = ticket.quantity ?? 0;
      if (availableQty < payload.quantity) {
        return response.error(res, null, "ticket quantity is not enough");
      }

      // Default discount 0
      let discount = 0;

      // Jika ada voucher di payload -> validasi & hitung discount
      if (payload.vouchertiket) {
        const voucher = await VoucherModel.findById(payload.vouchertiket);
        if (!voucher || !voucher.isActive) {
          return response.error(res, null, "Voucher tidak valid");
        }

        // Pastikan voucher khusus untuk event ini
        if (voucher.event && String(voucher.event) !== String(payload.events)) {
          return response.error(res, null, "Voucher not valid for this event");
        }

        // Pastikan applicableTickets (jika ada) termasuk tiket ini
        if (
          voucher.applicableTickets &&
          voucher.applicableTickets.length > 0 &&
          !voucher.applicableTickets
            .map(String)
            .includes(String(payload.ticket))
        ) {
          return response.error(
            res,
            null,
            "Voucher not applicable for this ticket"
          );
        }

        // Hitung subtotal (sebelum pajak & service fee)
        const subtotal = +ticket.price * +payload.quantity;

        // Cek minimal transaksi
        if (subtotal < (voucher.minTransaction ?? 0)) {
          return response.error(res, null, "Minimal transaksi tidak tercapai");
        }

        // Hitung diskon berdasarkan tipe voucher
        if (voucher.discountType === "persentase") {
          const rawDiscount = Math.round(
            (subtotal * (voucher.discountPercentage ?? 0)) / 100
          );
          discount = Math.min(rawDiscount, voucher.maxDiscount ?? rawDiscount);
        } else if (voucher.discountType === "jumlah tetap") {
          discount = voucher.nominaldeduction ?? 0;
        }

        // Cek kuota: hitung klaim yang sudah completed
        const totalClaims = await OrderModel.countDocuments({
          voucher: voucher._id,
          status: OrderStatus.COMPLETED,
        });

        if (
          voucher.quotaType === "limited" &&
          (voucher.quota ?? 0) <= totalClaims
        ) {
          return response.error(res, null, "Voucher quota exceeded");
        }

        // simpan voucher id di payload agar tersimpan di order
        (payload as any).voucher = voucher._id;
      }

      // Hitung total, pajak, service fee, grandTotal
      const total: number = +ticket.price * +payload.quantity;
      const pajak: number = Math.round(
        (total * (event.taxPercentage ?? 0)) / 100
      );
      const serviceFee = Math.round(total * 0.05) + 2500;
      const grandTotal = total + serviceFee + pajak - discount;

      Object.assign(payload, {
        ...payload,
        total,
        serviceFee,
        pajak,
        discount,
        grandTotal: Math.max(grandTotal, 0),
      });

      // create order
      const result = await OrderModel.create(payload);
      response.success(res, result, "success to create an order");
    } catch (error) {
      console.log("Validation error:", error);
      response.error(res, error, "failed to create an order");
    }
  },
  async findAll(req: IReqUser, res: Response) {
    try {
      const buildQuery = (filter: any) => {
        let query: FilterQuery<TypeOrder> = {};

        if (filter.search) query.$text = { $search: filter.search };

        return query;
      };

      const { limit = 10, page = 1, search } = req.query;

      const query = buildQuery({
        search,
      });

      const result = await OrderModel.find(query)
        .limit(+limit)
        .skip((+page - 1) * +limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const count = await OrderModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          current: +page,
          total: count,
          totalPages: Math.ceil(count / +limit),
        },
        "success find all orders"
      );
    } catch (error) {
      response.error(res, error, "failed find all orders");
    }
  },
  async findByEventOwner(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      const buildQuery = (filter: any) => {
        let query: FilterQuery<TypeOrder> = {};

        if (filter.search) query.$text = { $search: filter.search };

        return query;
      };

      const { limit = 10, page = 1, search } = req.query;

      const query = buildQuery({ search });

      // Ambil order dengan pagination
      const result = await OrderModel.find(query)
        .populate({
          path: "events",
          match: { createdBy: userId }, // hanya event yang dibuat oleh owner
          select: "name banner createdBy",
        })
        .populate("createdBy", "fullName")
        .populate("ticket", "name price")
        .limit(+limit)
        .skip((+page - 1) * +limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      // Filter order yang punya events sesuai owner
      const filtered = result.filter((order) => order.events !== null);

      const count = await OrderModel.countDocuments(); // total semua order

      response.pagination(
        res,
        filtered,
        {
          current: +page,
          total: count,
          totalPages: Math.ceil(count / +limit),
        },
        "success find orders by event owner"
      );
    } catch (error) {
      response.error(res, error, "failed find orders by event owner");
    }
  },
  async findOrderByEvent(req: IReqUser, res: Response) {
    try {
      const { eventId } = req.params;
      const { limit = 10, page = 1, search, ticketId } = req.query;

      if (!isValidObjectId(eventId)) {
        return response.error(res, null, "invalid event id");
      }

      if (ticketId && !isValidObjectId(ticketId)) {
        return response.error(res, null, "invalid ticket id");
      }

      const match: any = {
        events: new mongoose.Types.ObjectId(eventId),
      };
      if (ticketId) {
        match.ticket = new mongoose.Types.ObjectId(ticketId as string);
      }

      const pipeline: any[] = [
        { $match: match },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        { $unwind: "$createdBy" },
        {
          $lookup: {
            from: "events",
            localField: "events",
            foreignField: "_id",
            as: "events",
          },
        },
        { $unwind: "$events" },
        {
          $lookup: {
            from: "tickets",
            localField: "ticket",
            foreignField: "_id",
            as: "ticket",
          },
        },
        { $unwind: { path: "$ticket", preserveNullAndEmptyArrays: true } },
        // hanya ambil field yang perlu
        {
          $project: {
            orderId: 1,
            total: 1,
            serviceFee: 1,
            pajak: 1,
            grandTotal: 1,
            status: 1,
            discount: 1,
            quantity: 1,
            vouchers: 1,
            createdAt: 1,
            updatedAt: 1,
            payment: 1,
            "createdBy._id": 1,
            "createdBy.fullName": 1,
            "createdBy.email": 1,
            "createdBy.gender": 1,
            "createdBy.nohp": 1,
            "events._id": 1,
            "events.name": 1,
            "events.banner": 1,
            "ticket._id": 1,
            "ticket.name": 1,
            "ticket.price": 1,
          },
        },
      ];

      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { "createdBy.fullName": { $regex: search, $options: "i" } },
              { "createdBy.email": { $regex: search, $options: "i" } },
            ],
          },
        });
      }

      pipeline.push({ $sort: { createdAt: -1 } });
      pipeline.push({ $skip: (+page - 1) * +limit });
      pipeline.push({ $limit: +limit });

      const result = await OrderModel.aggregate(pipeline);

      // count pipeline (hapus limit, skip, sort, project)
      const countPipeline = [...pipeline];
      countPipeline.splice(-4); // hapus 4 tahap terakhir

      const countResult = await OrderModel.aggregate([
        ...countPipeline,
        { $count: "total" },
      ]);
      const count = countResult.length > 0 ? countResult[0].total : 0;

      response.pagination(
        res,
        result,
        {
          current: +page,
          total: count,
          totalPages: Math.ceil(count / +limit),
        },
        "success find orders by event"
      );
    } catch (error) {
      response.error(res, error, "failed find orders by event");
    }
  },
  async findTicketByOrganizer(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      const buildQuery = (filter: any) => {
        let query: FilterQuery<TypeOrder> = {
          status: OrderStatus.COMPLETED, // hanya completed
        };

        if (filter.search) query.$text = { $search: filter.search };

        return query;
      };
      const { limit = 10, page = 1, search } = req.query;

      const query = buildQuery({ search });

      // Query order dengan populate events owner
      const result = await OrderModel.find(query)
        .populate({
          path: "events",
          match: { createdBy: userId },
          select: "name banner createdBy",
        })
        .populate("createdBy", "fullName")
        .populate("ticket", "name price")
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      // Filter order yang punya events sesuai owner
      const filtered = result.filter((order) => order.events !== null);

      // Pagination manual
      const total = filtered.length;
      const startIndex = (+page - 1) * +limit;
      const paginatedResult = filtered.slice(startIndex, startIndex + +limit);

      response.pagination(
        res,
        paginatedResult,
        {
          current: +page,
          total,
          totalPages: Math.ceil(total / +limit),
        },
        "success find completed tickets by owner"
      );
    } catch (error) {
      response.error(res, error, "failed find completed tickets by owner");
    }
  },
  async findTicketByOwnerd(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      const buildQuery = (filter: any) => {
        let query: FilterQuery<TypeOrder> = {
          status: OrderStatus.COMPLETED, // hanya completed
        };

        if (filter.search) query.$text = { $search: filter.search };

        return query;
      };

      const { limit = 10, page = 1, search } = req.query;

      const query = buildQuery({ search });

      // Ambil order dengan pagination
      const result = await OrderModel.find(query)
        .populate({
          path: "events",
          match: { createdBy: userId }, // hanya event yang dibuat owner
          select: "name banner createdBy",
        })
        .populate("createdBy", "fullName")
        .populate("ticket", "name price")
        .limit(+limit)
        .skip((+page - 1) * +limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      // Filter order yang punya events sesuai owner
      const filtered = result.filter((order) => order.events !== null);

      const count = await OrderModel.countDocuments(); // total semua order

      response.pagination(
        res,
        filtered,
        {
          current: +page,
          total: count,
          totalPages: Math.ceil(count / +limit),
        },
        "success find completed tickets by owner"
      );
    } catch (error) {
      response.error(res, error, "failed find completed tickets by owner");
    }
  },
  async findOne(req: IReqUser, res: Response) {
    try {
      const { orderId } = req.params;
      const result = await OrderModel.findOne({
        orderId,
      }).populate("createdBy", "fullName");
      if (!result) return response.notFound(res, "order not found");

      response.success(res, result, "success to find one an order");
    } catch (error) {
      response.error(res, error, "failed to find one an order");
    }
  },
  // async findOne(req: IReqUser, res: Response) {
  //   try {
  //     const { orderId } = req.params;

  //     const result = await OrderModel.findOne({ orderId })
  //       .populate("events", "name banner")
  //       .populate("createdBy", "fullName")
  //       .populate("ticket", "name");

  //     if (!result) return response.notFound(res, "order not found");

  //     response.success(res, result, "success to find one an order");
  //   } catch (error) {
  //     response.error(res, error, "failed to find one an order");
  //   }
  // },
  async findAllByMember(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      const buildQuery = (filter: any) => {
        let query: FilterQuery<TypeOrder> = {
          createdBy: userId,
        };

        if (filter.search) query.$text = { $search: filter.search };

        return query;
      };

      const { limit = 10, page = 1, search } = req.query;

      const query = buildQuery({
        search,
      });

      const result = await OrderModel.find(query)
        .populate({
          path: "events",
          select: "name banner createdBy", // ambil juga createdBy di event
          populate: {
            path: "createdBy", // populate field di dalam events
            select: "fullName", // ambil kolom yang kamu butuhkan
          },
        })
        .populate("createdBy", "fullName")
        .populate("ticket", "name")
        .limit(+limit)
        .skip((+page - 1) * +limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const count = await OrderModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          current: +page,
          total: count,
          totalPages: Math.ceil(count / +limit),
        },
        "success find all orders"
      );
    } catch (error) {
      response.error(res, error, "failed find all orders");
    }
  },

  async complete(req: IReqUser, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      const order = await OrderModel.findOne({
        orderId,
        createdBy: userId,
      });

      if (!order) return response.notFound(res, "order not found");

      if (order.status === OrderStatus.COMPLETED)
        return response.error(res, null, "you have been completed this order");

      const vouchers: TypeVoucher[] = Array.from(
        { length: order.quantity },
        () => {
          return {
            isPrint: false,
            voucherId: getId(),
          } as TypeVoucher;
        }
      );

      const result = await OrderModel.findOneAndUpdate(
        {
          orderId,
          createdBy: userId,
        },
        {
          vouchers,
          status: OrderStatus.COMPLETED,
        },
        {
          new: true,
        }
      );

      const ticket = await TicketModel.findById(order.ticket);
      if (!ticket) return response.notFound(res, "ticket and order not found");

      await TicketModel.updateOne(
        {
          _id: ticket._id,
        },
        { quantity: (ticket.quantity ?? 0) - order.quantity }
      );

      response.success(res, result, "success to complete an order");
    } catch (error) {
      response.error(res, error, "failed to complete an order");
    }
  },
  async pending(req: IReqUser, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await OrderModel.findOne({
        orderId,
      });

      if (!order) return response.notFound(res, "order not found");

      if (order.status === OrderStatus.COMPLETED) {
        return response.error(res, null, "this order has been completed");
      }

      if (order.status === OrderStatus.PENDING) {
        return response.error(
          res,
          null,
          "this order currently in payment pending"
        );
      }

      const result = await OrderModel.findOneAndUpdate(
        { orderId },
        {
          status: OrderStatus.PENDING,
        },
        {
          new: true,
        }
      );

      response.success(res, result, "success to pending an order");
    } catch (error) {
      response.error(res, error, "failed to pending an order");
    }
  },
  async cancelled(req: IReqUser, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await OrderModel.findOne({
        orderId,
      });

      if (!order) return response.notFound(res, "order not found");

      if (order.status === OrderStatus.COMPLETED) {
        return response.error(res, null, "this order has been completed");
      }

      if (order.status === OrderStatus.CANCELLED) {
        return response.error(
          res,
          null,
          "this order currently in payment cancelled"
        );
      }

      const result = await OrderModel.findOneAndUpdate(
        { orderId },
        {
          status: OrderStatus.CANCELLED,
        },
        {
          new: true,
        }
      );

      response.success(res, result, "success to cancelled an order");
    } catch (error) {
      response.error(res, error, "failed to cancelled an order");
    }
  },
  async notification(req: Request, res: Response) {
    try {
      const { order_id, transaction_status, payment_type } = req.body;

      if (!order_id || !transaction_status) {
        return response.error(
          res,
          null,
          "order_id or transaction_status missing"
        );
      }

      const order = await OrderModel.findOne({ orderId: order_id });
      if (!order) return response.notFound(res, "order not found");

      // Tentukan status baru sesuai transaction_status Midtrans
      let newStatus: OrderStatus;
      switch (transaction_status) {
        case "settlement":
        case "capture":
          newStatus = OrderStatus.COMPLETED;
          break;
        case "pending":
          newStatus = OrderStatus.PENDING;
          break;
        case "cancel":
        case "deny":
        case "expire":
          newStatus = OrderStatus.CANCELLED;
          break;
        default:
          newStatus = order.status as OrderStatus;
      }

      const updateData: any = { status: newStatus };

      // Inject payment_type
      if (payment_type) {
        updateData["payment.payment_type"] = payment_type;

        if (payment_type === "bank_transfer" && req.body.va_numbers?.length) {
          updateData["payment.bank"] = req.body.va_numbers[0].bank;
          updateData["payment.va_number"] = req.body.va_numbers[0].va_number;
        } else if (req.body.bank) {
          // Misal untuk credit_card, QRIS, e-wallet
          updateData["payment.bank"] = req.body.bank;
        }
      }

      // Simpan transaction_time terpisah agar selalu masuk
      updateData["payment.transaction_time"] =
        req.body.transaction_time ?? new Date();

      // Jika COMPLETED → generate barcode + kurangi tiket
      if (
        newStatus === OrderStatus.COMPLETED &&
        order.status !== OrderStatus.COMPLETED
      ) {
        // generate barcode (sebanyak quantity)
        const barcodes = Array.from({ length: order.quantity }).map(() => ({
          order: order._id,
          event: order.events,
          ticket: order.ticket,
          owner: order.createdBy,
          code: getId(), // bisa pakai nanoid/uuid, sekarang pakai getId()
        }));

        await BarcodeModel.insertMany(barcodes);

        // kurangi jumlah tiket
        const ticket = await TicketModel.findById(order.ticket);
        if (ticket) {
          if (ticket.quotaType === "limited") {
            ticket.quantity = Math.max(
              (ticket.quantity ?? 0) - order.quantity,
              0
            );
            await ticket.save();
          }
        }

        // kalau ada voucher tiket (voucher global, misal diskon), kurangi juga kuotanya
        if (order.vouchertiket) {
          const voucher = await VoucherModel.findById(order.vouchertiket);
          if (voucher && voucher.quotaType === "limited") {
            voucher.quota = Math.max((voucher.quota ?? 0) - 1, 0);
            await voucher.save();
          }
        }

        // cari event + organizer (pemilik event)
        const event = await mongoose
          .model("Event")
          .findById(order.events)
          .populate("createdBy");
        if (event && event.createdBy) {
          let wallet = await WalletModel.findOne({ user: event.createdBy });
          if (!wallet) {
            wallet = await WalletModel.create({
              user: event.createdBy,
              balance: 0,
            });
          }

          // tambahkan saldo (misalnya grandTotal dikurangi fee platform)
          const platformFee = Math.floor(order.serviceFee); // contoh: serviceFee masuk platform
          const income = order.grandTotal - platformFee;

          wallet.balance += income;
          await wallet.save();

          // catat transaksi wallet
          await WalletTransactionModel.create({
            wallet: wallet._id,
            amount: income,
            type: "income",
            order: order._id,
            status: "success",
          });
        }
      }

      const updated = await OrderModel.findOneAndUpdate(
        { orderId: order_id },
        updateData,
        { new: true }
      );

      return response.success(
        res,
        updated,
        "notification processed successfully"
      );
    } catch (error) {
      return response.error(res, error, "failed to process notification");
    }
  },
  async remove(req: IReqUser, res: Response) {
    try {
      const { orderId } = req.params;
      const result = await OrderModel.findOneAndDelete(
        {
          orderId,
        },
        {
          new: true,
        }
      );

      if (!result) {
        return response.notFound(res, "order not found");
      }

      response.success(res, result, "success to remove an order");
    } catch (error) {
      response.error(res, error, "failed to remove an order");
    }
  },

  // scan
  async scanVoucher(req: IReqUser, res: Response) {
    try {
      const { voucherId } = req.body;

      if (!voucherId) {
        return response.errors(res, null, "voucherId is required");
      }

      // Cari order yang punya voucher ini
      const order = await OrderModel.findOne({
        "vouchers.voucherId": voucherId,
      });

      if (!order) {
        return response.notFound(res, "voucher not found");
      }

      // Cari voucher di array
      const voucher = order.vouchers.find((v) => v.voucherId === voucherId);

      if (!voucher) {
        return response.notFound(res, "voucher not found in order");
      }

      if (voucher.isPrint) {
        return res.status(400).json({
          meta: {
            status: 400,
            message: "voucher already used",
          },
          data: null,
        });
      }

      // ✅ Update langsung tanpa trigger pre("save")
      await OrderModel.updateOne(
        { "vouchers.voucherId": voucherId },
        { $set: { "vouchers.$.isPrint": true } }
      );

      return response.success(
        res,
        {
          orderId: order.orderId,
          voucherId,
          status: "used",
        },
        "voucher valid, access granted"
      );
    } catch (error) {
      return response.errors(res, error, "failed to scan voucher");
    }
  },
};
