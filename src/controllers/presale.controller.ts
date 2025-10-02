import { Request, Response } from "express";
import response from "../utils/response";
import PresaleModel, {
  presaleDTO,
  TypePresale,
} from "../models/PresaleQueue.model";
import { IReqUser } from "../utils/interfaces";

export default {
  // daftar ke presale
  async joinPresale(req: IReqUser, res: Response) {
    try {
      const userId = req.user?.id;
      const eventId = req.body.event;

      // Cek apakah user sudah join presale
      const exist = await PresaleModel.findOne({
        user: userId,
        event: eventId,
      });
      if (exist) {
        return response.error(res, null, "User already joined presale");
      }

      const payload = { ...req.body, user: userId } as TypePresale;

      await presaleDTO.validate(payload);

      // Buat entry presale dengan status default "waiting"
      const result = await PresaleModel.create(payload);

      response.success(
        res,
        result,
        "success join presale, pending notification"
      );
    } catch (error) {
      response.error(res, error, "failed to join presale");
    }
  },
  // async joinPresale(req: IReqUser, res: Response) {
  //   try {
  //     const userId = req.user?.id;
  //     const eventId = req.body.event;

  //     const exist = await PresaleModel.findOne({
  //       user: userId,
  //       event: eventId,
  //     });
  //     if (exist) {
  //       return response.error(res, null, "User already joined presale");
  //     }

  //     const payload = { ...req.body, user: userId } as TypePresale;

  //     await presaleDTO.validate(payload);

  //     // Buat entry presale tapi langsung status "notified"
  //     const result = await PresaleModel.create({
  //       ...payload,
  //       status: "notified",
  //     });

  //     // Karena post("save") hook, email akan otomatis terkirim
  //     response.success(res, result, "success join presale & notification sent");
  //   } catch (error) {
  //     response.error(res, error, "failed to join presale");
  //   }
  // },
  // lihat semua queue per event (EO/Admin)
  async getQueueByEvent(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const queue = await PresaleModel.find({ event: eventId })
        .populate("user", "fullName email")
        .populate("event", "name startDate");
      res.json(queue);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
  // update status (misal EO kasih notifikasi)
  async notifyUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const queue = await PresaleModel.findById(id);
      if (!queue) return res.status(404).json({ message: "Queue not found" });

      queue.status = "notified";
      await queue.save(); // <-- ini akan trigger hook post("save") dan kirim email

      res.json({ message: "User notified 📢", queue });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
