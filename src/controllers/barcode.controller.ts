import { Request, Response } from "express";
import BarcodeModel from "../models/barcode.model";
import response from "../utils/response";
import { isValidObjectId } from "mongoose";

export default {
  async getByOrderId(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      if (!isValidObjectId(orderId)) {
        return response.error(res, null, "invalid order id");
      }

      const barcodes = await BarcodeModel.find({ order: orderId })
        .populate("event", "name date")
        .populate("ticket", "name price")
        .populate("owner", "fullName email");

      if (!barcodes || barcodes.length === 0) {
        return response.notFound(res, "no barcodes found for this order");
      }

      return response.success(res, barcodes, "barcodes fetched successfully");
    } catch (error) {
      return response.error(res, error, "failed to fetch barcodes");
    }
  },
};
