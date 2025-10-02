import mongoose, { Schema, ObjectId } from "mongoose";
import { ORDER_MODEL_NAME } from "./order.model";
import { TICKET_MODEL_NAME } from "./ticket.model";
import { EVENT_MODEL_NAME } from "./event.model";
import { USER_MODEL_NAME } from "./user.model";

export const BARCODE_MODEL_NAME = "Barcode";

export interface Barcode {
  order: ObjectId; // relasi ke order
  event: ObjectId; // relasi ke event (biar gampang query by event)
  ticket: ObjectId; // relasi ke ticket (tipe tiket)
  owner: ObjectId; // user yang beli tiket
  code: string; // barcode/QR unik
  isUsed: boolean; // apakah sudah discan
  usedAt?: Date; // kapan discan
  isActive: boolean; // bisa dimatikan/diaktifkan
  scannedBy?: ObjectId; // user/organizer yang melakukan scan
}

const BarcodeSchema = new Schema<Barcode>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: ORDER_MODEL_NAME,
      required: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: EVENT_MODEL_NAME,
      required: true,
    },
    ticket: {
      type: Schema.Types.ObjectId,
      ref: TICKET_MODEL_NAME,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL_NAME,
      required: true,
    },
    code: {
      type: Schema.Types.String,
      required: true,
      unique: true,
    },
    isUsed: {
      type: Schema.Types.Boolean,
      default: false,
    },
    usedAt: {
      type: Schema.Types.Date,
    },
    isActive: {
      type: Schema.Types.Boolean,
      default: true,
    },
    scannedBy: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL_NAME, // misalnya staff/organizer
    },
  },
  {
    timestamps: true,
  }
);

// Index untuk mempercepat query
BarcodeSchema.index({ order: 1, event: 1 });

const BarcodeModel = mongoose.model<Barcode>(BARCODE_MODEL_NAME, BarcodeSchema);

export default BarcodeModel;
