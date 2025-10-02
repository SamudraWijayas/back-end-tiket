import { Response } from "express";
import { IPaginationQuery, IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import { FilterQuery, isValidObjectId } from "mongoose";
import VoucherModel, { voucherDTO, TypeVoucher } from "../models/voucher.model";
import OrderModel, { OrderStatus } from "../models/order.model";

export default {
  async create(req: IReqUser, res: Response) {
    try {
      // ✅ Validasi dengan Yup
      const payload = await voucherDTO.validate(req.body, {
        abortEarly: false,
      });

      if (payload.quotaType === "limited" && !payload.quota) {
        return response.error(
          res,
          null,
          "quota is required when quotaType is limited"
        );
      }

      const result = await VoucherModel.create(payload);
      response.success(res, result, "success create a voucher");
    } catch (error) {
      response.error(res, error, "failed to create a voucher");
    }
  },

  async findAll(req: IReqUser, res: Response) {
    try {
      const {
        limit = 10,
        page = 1,
        search,
        isActive,
      } = req.query as unknown as IPaginationQuery & { isActive?: string };

      const query: FilterQuery<TypeVoucher> = {};

      if (search) {
        Object.assign(query, {
          $text: { $search: search },
        });
      }

      if (isActive === "true") {
        Object.assign(query, { isActive: true });
      }

      const result = await VoucherModel.find(query)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .sort({ createdAt: -1 })
        .exec();

      const count = await VoucherModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          total: count,
          current: Number(page),
          totalPages: Math.ceil(count / Number(limit)),
        },
        "success find all vouchers"
      );
    } catch (error) {
      response.error(res, error, "failed to find all vouchers");
    }
  },

  async findOne(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "invalid voucher id");
      }

      const result = await VoucherModel.findById(id)
        .populate("event")
        .populate("applicableTickets");

      if (!result) {
        return response.notFound(res, "voucher not found");
      }

      response.success(res, result, "success find one voucher");
    } catch (error) {
      response.error(res, error, "failed to find one voucher");
    }
  },

  async update(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "invalid voucher id");
      }

      const payload = await voucherDTO.validate(req.body, {
        abortEarly: false,
      });

      if (payload.quotaType === "limited" && !payload.quota) {
        return response.error(
          res,
          null,
          "quota is required when quotaType is limited"
        );
      }

      const result = await VoucherModel.findByIdAndUpdate(id, payload, {
        new: true,
      });

      response.success(res, result, "success update a voucher");
    } catch (error) {
      response.error(res, error, "failed to update voucher");
    }
  },

  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "invalid voucher id");
      }

      const result = await VoucherModel.findByIdAndDelete(id);
      response.success(res, result, "success remove a voucher");
    } catch (error) {
      response.error(res, error, "failed to remove voucher");
    }
  },

  async findAllByEvent(req: IReqUser, res: Response) {
    try {
      const { eventId } = req.params;

      if (!isValidObjectId(eventId)) {
        return response.error(res, null, "invalid event id");
      }

      // ambil semua voucher untuk event ini
      const vouchers = await VoucherModel.find({ event: eventId })
        .sort({ createdAt: -1 })
        .lean();

      const vouchersWithUsage = await Promise.all(
        vouchers.map(async (voucher) => {
          // Hitung jumlah order yang pakai voucher ini (vouchertiket)
          const usedAsTicketVoucher = await OrderModel.countDocuments({
            vouchertiket: voucher._id,
            status: OrderStatus.COMPLETED,
          });

          // Hitung jumlah order yang pakai voucher di array "vouchers"
          const usedInArray = await OrderModel.countDocuments({
            "vouchers.voucherId": String(voucher._id),
            status: OrderStatus.COMPLETED,
          });

          const totalUsed = usedAsTicketVoucher + usedInArray;

          return {
            ...voucher,
            usedCount: totalUsed,
            remainingQuota:
              voucher.quotaType === "limited"
                ? (voucher.quota ?? 0) - totalUsed
                : "Unlimited",
            displayQuota:
              voucher.quotaType === "limited"
                ? `${totalUsed} / ${voucher.quota}`
                : "Unlimited",
          };
        })
      );

      response.success(
        res,
        vouchersWithUsage,
        "success find all vouchers by event"
      );
    } catch (error) {
      response.error(res, error, "failed to find all vouchers by event");
    }
  },
  async updateStatus(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (!isValidObjectId(id)) {
        return response.notFound(res, "invalid voucher id");
      }

      if (typeof isActive !== "boolean") {
        return response.error(res, null, "isActive must be a boolean");
      }

      const result = await VoucherModel.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      );

      if (!result) {
        return response.notFound(res, "voucher not found");
      }

      response.success(res, result, "success update voucher status");
    } catch (error) {
      response.error(res, error, "failed to update voucher status");
    }
  },
  async validateVoucher(req: IReqUser, res: Response) {
    try {
      const { code, ticketId, eventId } = req.body;
      console.log("REQ CODE:", code);

      const voucher = await VoucherModel.findOne({ code, isActive: true });

      if (!voucher) return response.notFound(res, "Voucher not found");

      // ✅ Cek apakah voucher untuk event yang benar
      if (eventId && String(voucher.event) !== String(eventId)) {
        return response.error(res, null, "Voucher not valid for this event");
      }

      if (
        voucher.quotaType === "limited" &&
        voucher.quota !== undefined &&
        voucher.quota <= 0
      ) {
        return response.error(res, null, "Voucher quota exceeded");
      }

      if (
        voucher.applicableTickets?.length &&
        ticketId &&
        !voucher.applicableTickets.map(String).includes(String(ticketId))
      ) {
        return response.error(
          res,
          null,
          "Voucher not applicable for this ticket"
        );
      }

      response.success(res, voucher, "Voucher is valid");
    } catch (error) {
      response.error(res, error, "Failed to validate voucher");
    }
  },
};
