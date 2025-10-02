import mongoose, { Schema, ObjectId } from "mongoose";
import { ORGANIZER_MODEL_NAME } from "./organizer.model";

export const WALLET_MODEL_NAME = "Wallet";

export interface Wallet {
  user: ObjectId; // organizer pemilik saldo
  balance: number; // saldo total
}

const WalletSchema = new Schema<Wallet>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: ORGANIZER_MODEL_NAME,
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const WalletModel = mongoose.model(WALLET_MODEL_NAME, WalletSchema);
export default WalletModel;
