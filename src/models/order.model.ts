import mongoose, { mongo, ObjectId, Schema } from "mongoose";
import * as Yup from "yup";
import { EVENT_MODEL_NAME } from "./event.model";
import { USER_MODEL_NAME } from "./user.model";
import { TICKET_MODEL_NAME } from "./ticket.model";
import { VOUCHER_MODEL_NAME } from "./voucher.model";
import { getId } from "../utils/id";
import payment, { MidtransItem, TypeResponseMidtrans } from "../utils/payment";
import { truncate } from "fs";

export const ORDER_MODEL_NAME = "Order";

export const orderDTO = Yup.object({
  createdBy: Yup.string().required(),
  events: Yup.string().required(),
  ticket: Yup.string().required(),
  quantity: Yup.number().required(),
  vouchertiket: Yup.string().notRequired(),
});

export type TypeOrder = Yup.InferType<typeof orderDTO>;

export enum OrderStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export type TypeVoucher = {
  voucherId: string;
  isPrint: boolean;
};

export interface Order
  extends Omit<TypeOrder, "createdBy" | "events" | "ticket"> {
  total: number;
  serviceFee: number;
  pajak: number;
  grandTotal: number;
  status: string;
  payment: TypeResponseMidtrans;
  createdBy: ObjectId;
  events: ObjectId;
  orderId: string;
  ticket: ObjectId;
  quantity: number;
  vouchers: TypeVoucher[];
  discount: number;
  vouchertiket?: string;
  noFaktur: string;
}

const OrderSchema = new Schema<Order>(
  {
    orderId: {
      type: Schema.Types.String,
    },
    noFaktur: {
      type: Schema.Types.String,
      unique: true, // supaya tidak duplikat
      required: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL_NAME,
      required: true,
    },
    events: {
      type: Schema.Types.ObjectId,
      ref: EVENT_MODEL_NAME,
      required: true,
    },
    total: {
      type: Schema.Types.Number,
      required: true,
    },
    serviceFee: {
      type: Schema.Types.Number,
      default: 0,
    },
    pajak: {
      type: Schema.Types.Number,
      required: true,
    },
    grandTotal: {
      type: Schema.Types.Number,
      required: true,
    },
    payment: {
      type: {
        token: {
          type: Schema.Types.String,
          required: true,
        },
        redirect_url: {
          type: Schema.Types.String,
          required: true,
        },
        payment_type: {
          type: Schema.Types.String,
        },
        bank: { type: Schema.Types.String },
        va_number: { type: Schema.Types.String },
        transaction_time: { type: Date },
      },
    },

    status: {
      type: Schema.Types.String,
      enum: [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      default: OrderStatus.PENDING,
    },
    ticket: {
      type: Schema.Types.ObjectId,
      ref: TICKET_MODEL_NAME,
      required: true,
    },
    vouchertiket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: VOUCHER_MODEL_NAME,
      required: false,
    },
    discount: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Schema.Types.Number,
      required: true,
    },
    vouchers: {
      type: [
        {
          voucherId: {
            type: Schema.Types.String,
          },
          isPrint: {
            type: Schema.Types.Boolean,
            default: false,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
).index({ orderId: "text" });



OrderSchema.pre("save", async function () {
  const order = this;
  order.orderId = getId();

  // format no faktur => FA-YYYYMMDD-XXXX
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  // cari jumlah order hari ini (buat running number)
  const countToday = await mongoose.model<Order>("Order").countDocuments({
    createdAt: {
      $gte: new Date(today.setHours(0, 0, 0, 0)),
      $lt: new Date(today.setHours(23, 59, 59, 999)),
    },
  });

  order.noFaktur = `FA-${dateStr}-${String(countToday + 1).padStart(4, "0")}`;
  // ambil data tiket
  const ticket = await mongoose.model("Ticket").findById(order.ticket);
  if (!ticket) throw new Error("Ticket not found");

  // ambil data user
  const user = await mongoose.model("User").findById(order.createdBy);
  if (!user) throw new Error("User not found");

  // ambil data event
  const event = await mongoose.model("Event").findById(order.events);
  if (!event) throw new Error("Event not found");

  const itemName = `${event.name} - ${ticket.name}`.substring(0, 50);

  const item_details: MidtransItem[] = [
    {
      id: ticket._id.toString(),
      price: ticket.price,
      quantity: order.quantity,
      name: itemName,
    },
    {
      id: "service-fee",
      price: order.serviceFee,
      quantity: 1,
      name: "Service Fee",
    },
    {
      id: "tax",
      price: order.pajak,
      quantity: 1,
      name: "Pajak",
    },
  ];

  if (order.discount && order.discount > 0) {
    item_details.push({
      id: "voucher-discount",
      price: -Math.abs(order.discount),
      quantity: 1,
      name: "Voucher Discount",
    });
  }

  order.payment = await payment.createLink({
    transaction_details: {
      gross_amount: order.grandTotal,
      order_id: order.orderId,
    },
    item_details,
    customer_details: {
      first_name: user.fullName || "Guest",
      email: user.email || "",
    },
    // callbacks: {
    //   finish: "https://www.jokindess.com/payment",
    //   error: "https://www.jokindess.com/payment",
    //   pending: "https://www.jokindess.com/payment",
    // },
  });
});

const OrderModel = mongoose.model(ORDER_MODEL_NAME, OrderSchema);
export default OrderModel;
