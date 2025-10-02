import mongoose, { Schema } from "mongoose";
import * as Yup from "yup";
import { TICKET_MODEL_NAME } from "./ticket.model";
import { EVENT_MODEL_NAME } from "./event.model";

export const VOUCHER_MODEL_NAME = "Voucher";

/**
 * ✅ Yup Validation Schema
 */
export const voucherDTO = Yup.object({
  code: Yup.string().required("Voucher code is required"),

  type: Yup.mixed<"public" | "private">()
    .oneOf(["public", "private"])
    .required("Voucher type is required"),

  discountType: Yup.mixed<"persentase" | "jumlah tetap">()
    .oneOf(["persentase", "jumlah tetap"])
    .required("Discount type is required"),

  discountPercentage: Yup.number().when("discountType", {
    is: "persentase",
    then: (schema) =>
      schema.required("persentase diskon is required").min(1).max(100),
    otherwise: (schema) => schema.optional(),
  }),

  nominaldeduction: Yup.number().when("discountType", {
    is: "jumlah tetap",
    then: (schema) =>
      schema.required("Nominal potongan required for fixed amount"),
    otherwise: (schema) => schema.optional(),
  }),

  minTransaction: Yup.number().when("discountType", {
    is: (val: string) => val === "persentase" || val === "jumlah tetap",
    then: (schema) =>
      schema.min(0, "Minimal transaksi harus >= 0").notRequired(),
    otherwise: (schema) => schema.notRequired(),
  }),

  maxDiscount: Yup.number().when("discountType", {
    is: "persentase",
    then: (schema) => schema.min(1, "Maksimal diskon harus >= 1").notRequired(),
    otherwise: (schema) => schema.notRequired(),
  }),

  quotaType: Yup.mixed<"limited" | "unlimited">()
    .oneOf(["limited", "unlimited"])
    .required("Quota type is required"),

  quota: Yup.number().when("quotaType", {
    is: "limited",
    then: (schema) => schema.required("Quota is required when limited").min(1),
    otherwise: (schema) => schema.optional(),
  }),

  // Event wajib → voucher berlaku di event tertentu
  event: Yup.string().required("Event reference is required"),

  // Opsional: berlaku untuk tiket spesifik
  applicableTickets: Yup.array().of(Yup.string()),

  isActive: Yup.boolean().default(true),
});

export type TypeVoucher = Yup.InferType<typeof voucherDTO>;

/**
 * ✅ Mongoose Model
 */
interface Voucher extends Omit<TypeVoucher, "applicableTickets" | "event"> {
  applicableTickets?: Schema.Types.ObjectId[];
  event: Schema.Types.ObjectId;
}

const VoucherSchema = new Schema<Voucher>(
  {
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ["public", "private"], required: true },

    discountType: {
      type: String,
      enum: ["persentase", "jumlah tetap"],
      required: true,
    },
    discountPercentage: { type: Number },
    nominaldeduction: { type: Number },

    minTransaction: { type: Number },
    maxDiscount: { type: Number },

    quotaType: { type: String, enum: ["limited", "unlimited"], required: true },
    quota: { type: Number },

    event: {
      type: Schema.Types.ObjectId,
      ref: EVENT_MODEL_NAME,
      required: true,
    },
    applicableTickets: [
      { type: Schema.Types.ObjectId, ref: TICKET_MODEL_NAME },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
).index({ code: "text" });

const VoucherModel = mongoose.model(VOUCHER_MODEL_NAME, VoucherSchema);
export default VoucherModel;
