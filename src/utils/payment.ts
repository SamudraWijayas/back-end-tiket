import axios from "axios";
import { MIDTRANS_SERVER_KEY, MIDTRANS_TRANSACTION_URL } from "./env";

export interface MidtransItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface Payment {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  item_details: MidtransItem[];
  customer_details: {
    first_name: string;
    email: string;
  };
  // callbacks: {
  //   finish: string;
  //   error: string;
  //   pending: "https://www.jokindess.com/payment";
  // };
}

export type TypeResponseMidtrans = {
  token: string;
  redirect_url: string;
  payment_type?: string;
  bank?: string;
  va_number?: string;
  transaction_time?: Date;
};

export default {
  async createLink(payload: Payment): Promise<TypeResponseMidtrans> {
    const result = await axios.post<TypeResponseMidtrans>(
      `${MIDTRANS_TRANSACTION_URL}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(
            `${MIDTRANS_SERVER_KEY}:`
          ).toString("base64")}`,
        },
      }
    );
    if (result.status !== 201) {
      throw new Error("payment failed");
    }
    return result?.data;
  },
};
