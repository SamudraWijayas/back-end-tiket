import mongoose, { ObjectId } from "mongoose";
import * as Yup from "yup";
import { renderMailHtml, sendMail } from "../utils/mail/mail";
import { EMAIL_SMTP_USER } from "../utils/env";

export const PRESALE_MODEL_NAME = "PresaleQueue";

const Schema = mongoose.Schema;

export const presaleDTO = Yup.object({
  user: Yup.string().required(),
  event: Yup.string().required(),
  status: Yup.string()
    .oneOf(["waiting", "notified", "purchased"])
    .default("waiting")
    .optional(),
});

export type TypePresale = Yup.InferType<typeof presaleDTO>;

export interface Presale extends Omit<TypePresale, "user" | "event"> {
  user: ObjectId;
  event: ObjectId;
}

const PresaleSchema = new Schema<Presale>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    status: {
      type: Schema.Types.String,
      enum: ["waiting", "notified", "purchased"],
      default: "waiting",
    },
  },
  {
    timestamps: true,
  }
);

// setelah status berubah jadi "notified", kirim email otomatis
PresaleSchema.post("save", async function (doc, next) {
  try {
    const presale = doc;
    if (presale.status === "notified") {
      await presale.populate("user", "email fullName username");
      await presale.populate("event", "name startDate");

      const user: any = presale.user;
      const event: any = presale.event;

      const contentMail = await renderMailHtml("presale-notification.ejs", {
        fullName: user.fullName,
        username: user.username,
        eventName: event.name,
        eventDate: event.startDate,
      });

      await sendMail({
        from: EMAIL_SMTP_USER,
        to: user.email,
        subject: `Presale Dibuka untuk ${event.name}!`,
        html: contentMail,
      });

      console.log(`📧 Email presale terkirim ke ${user.email}`);
    }
  } catch (error) {
    console.log("Presale email error:", error);
  } finally {
    next();
  }
});

const PresaleModel = mongoose.model(PRESALE_MODEL_NAME, PresaleSchema);

export default PresaleModel;
