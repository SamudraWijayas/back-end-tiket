import { Response } from "express";
import SettlementModel from "../models/settlement.model";
import OrderModel, { OrderStatus } from "../models/order.model";
import response from "../utils/response";
import { IReqUser } from "../utils/interfaces";

class SettlementController {
  // 📌 Buat permintaan pencairan baru
  async requestSettlement(req: IReqUser, res: Response) {
    try {
      const { orders, notes } = req.body;
      const organizerId = req.user?.id;

      const selectedOrders = await OrderModel.find({
        _id: { $in: orders },
        status: OrderStatus.COMPLETED,
      });

      if (!selectedOrders.length) {
        response.error(res, new Error("No valid orders for settlement"), "No valid orders for settlement");
      }

      const grossAmount = selectedOrders.reduce((sum, o) => sum + o.total, 0);
      const platformDeductions = grossAmount * 0.05; // misalnya fee 5%
      const netAmount = grossAmount - platformDeductions;

      const settlement = await SettlementModel.create({
        organizer: organizerId,
        orders,
        grossAmount,
        platformDeductions,
        netAmount,
        status: "pending",
        requestedBy: organizerId,
        notes,
      });

      return response.success(res, settlement, "Settlement request created");
    } catch (err) {
      console.error(err);
      response.error(res, err, "Failed to create settlement request");
    }
  }

  // 📌 Konfirmasi pencairan oleh admin (upload bukti transfer)
  async confirmSettlement(req: IReqUser, res: Response) {
    try {
      const { settlementId, transferReference } = req.body;
      const proofFile = req.file?.path; // kalau pakai multer untuk upload

      const settlement = await SettlementModel.findByIdAndUpdate(
        settlementId,
        {
          status: "settled",
          approvedBy: req.user?.id,
          approvedAt: new Date(),
          settledAt: new Date(),
          transferReference,
          proofFile,
        },
        { new: true }
      );

      if (!settlement) return response.notFound(res, "Settlement not found");

      return response.success(res, settlement, "Settlement confirmed");
    } catch (err) {
      console.error(err);
      response.error(res, err, "Failed to confirm settlement");
    }
  }

  // 📌 Dashboard Organizer
  async getDashboard(req: IReqUser, res: Response) {
    try {
      const organizerId = req.user?.id;

      // 1. Total Pendapatan dari Order
      const totalOrders = await OrderModel.aggregate([
        { $match: { organizer: organizerId, status: OrderStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]);
      const totalRevenue = totalOrders[0]?.total || 0;

      // 2. Settlement summary
      const settlements = await SettlementModel.find({
        organizer: organizerId,
      });

      const settled = settlements
        .filter((s) => s.status === "settled")
        .reduce((sum, s) => sum + s.netAmount, 0);

      const pending = settlements
        .filter((s) => s.status === "pending")
        .reduce((sum, s) => sum + s.netAmount, 0);

      const withdrawn = settled + pending;
      const notWithdrawn = totalRevenue - withdrawn;

      return response.success(
        res,
        {
          totalRevenue,
          notWithdrawn,
          pending,
          settled,
        },
        "sukses get dashboard"
      );
    } catch (err) {
      console.error(err);
      response.error(res, err, "Failed to load dashboard");
    }
  }

  // 📌 Riwayat pencairan
  async getHistory(req: IReqUser, res: Response) {
    try {
      const organizerId = req.user?.id;
      const settlements = await SettlementModel.find({ organizer: organizerId })
        .sort({ requestedAt: -1 })
        .lean();

      response.success(res, settlements, "success get history");
    } catch (error) {
      response.error(res, error, "Failed to load settlement history");
    }
  }
}

export default new SettlementController();
