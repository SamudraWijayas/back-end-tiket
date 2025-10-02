import mongoose, { Schema, Document } from "mongoose";
import * as Yup from "yup";
import { EVENT_MODEL_NAME } from "./event.model";

export const TICKET_MODEL_NAME = "Ticket";

/**
 * ✅ Yup Validation Schema
 */
export const ticketDTO = Yup.object({
  name: Yup.string().required("Ticket name is required"),
  price: Yup.number().required("Ticket price is required"),
  description: Yup.string().required("Ticket description is required"),
  events: Yup.string().required("Event reference is required"),

  // General
  maxPurchase: Yup.number().min(1).required("Maximum purchase is required"),
  quotaType: Yup.mixed<"limited" | "unlimited">()
    .oneOf(["limited", "unlimited"])
    .required(),
  quantity: Yup.number().when("quotaType", {
    is: "limited",
    then: (schema) => schema.required().min(1),
    otherwise: (schema) => schema.optional(),
  }),

  // Scan settings
  isScannable: Yup.boolean().default(true),
  scanMultiple: Yup.boolean().default(false),
  scanStart: Yup.date().nullable(),
  scanEnd: Yup.date().nullable(),

  // Style
  ticketStyle: Yup.object({
    headerColor: Yup.string().default("#2563eb"),
    logoColor: Yup.string().default("#000000"),
    backgroundColor: Yup.string().default("#ffffff"),
    customNote: Yup.string().optional(),
  }),

  // Sales
  saleStart: Yup.date().required("Sale start date is required"),
  saleEnd: Yup.date().required("Sale end date is required"),
  salesType: Yup.mixed<"online" | "offline">()
    .oneOf(["online", "offline"])
    .required(),

  isActive: Yup.boolean().default(true),
});

export type TypeTicket = Yup.InferType<typeof ticketDTO>;

/**
 * ✅ Mongoose Model
 */
export interface TicketDoc extends Omit<TypeTicket, "events">, Document {
  events: Schema.Types.ObjectId;
  initialQuantity?: number; // tambahin di interface
}

const TicketSchema = new Schema<TicketDoc>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    events: {
      type: Schema.Types.ObjectId,
      ref: EVENT_MODEL_NAME,
      required: true,
    },

    // General
    maxPurchase: { type: Number, required: true },
    quotaType: { type: String, enum: ["limited", "unlimited"], required: true },
    quantity: { type: Number },
    initialQuantity: { type: Number }, // auto set on create

    // Scan settings
    isScannable: { type: Boolean, default: true },
    scanMultiple: { type: Boolean, default: false },
    scanStart: { type: Date },  
    scanEnd: { type: Date },

    // Style
    ticketStyle: {
      headerColor: { type: String, default: "#2563eb" },
      logoColor: { type: String, default: "#000000" },
      backgroundColor: { type: String, default: "#ffffff" },
      customNote: { type: String },
    },

    // Sales
    saleStart: { type: Date, required: true },
    saleEnd: { type: Date, required: true },
    salesType: { type: String, enum: ["online", "offline"], required: true },
  },
  { timestamps: true }
).index({ name: "text" });

/**
 * ✅ Hook: set initialQuantity = quantity hanya saat pertama kali create
 */
TicketSchema.pre<TicketDoc>("save", function (next) {
  if (this.isNew && this.quotaType === "limited") {
    this.initialQuantity = this.quantity;
  }
  next();
});

const TicketModel = mongoose.model<TicketDoc>(TICKET_MODEL_NAME, TicketSchema);
export default TicketModel;
