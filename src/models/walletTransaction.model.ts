import mongoose, { Schema, ObjectId } from "mongoose";
import { WALLET_MODEL_NAME } from "./wallet.model";
import { ORDER_MODEL_NAME } from "./order.model";

export const WALLET_TX_MODEL_NAME = "WalletTransaction";

export enum WalletTxType {
  INCOME = "income",
  WITHDRAW = "withdraw",
}

export interface WalletTransaction {
  wallet: ObjectId;
  amount: number;
  type: WalletTxType;
  order?: ObjectId; // kalau dari order
  status: "pending" | "success" | "failed";
}

const WalletTransactionSchema = new Schema<WalletTransaction>(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: WALLET_MODEL_NAME,
      required: true,
    },
    amount: { type: Number, required: true },
    type: { type: String, enum: Object.values(WalletTxType), required: true },
    order: { type: Schema.Types.ObjectId, ref: ORDER_MODEL_NAME },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const WalletTransactionModel = mongoose.model(
  WALLET_TX_MODEL_NAME,
  WalletTransactionSchema
);
export default WalletTransactionModel;
