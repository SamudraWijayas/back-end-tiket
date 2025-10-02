import mongoose, { ObjectId } from "mongoose";
import * as Yup from "yup";
import UserModel, { ORGANIZER_MODEL_NAME } from "./organizer.model";
import { renderMailHtml, sendMail } from "../utils/mail/mail";
import { CLIENT_HOST, EMAIL_SMTP_USER } from "../utils/env";

export const EVENT_MODEL_NAME = "Event";

const Schema = mongoose.Schema;

export const eventDTO = Yup.object({
  name: Yup.string().required(),
  startDate: Yup.string().required(),
  endDate: Yup.string().required(),
  description: Yup.string().required(),
  banner: Yup.string().required(),
  isFeatured: Yup.boolean().required(),
  isOnline: Yup.boolean().required(),
  isPublish: Yup.boolean(),
  category: Yup.string().required(),
  slug: Yup.string(),
  createdBy: Yup.string().required(),
  createdAt: Yup.string(),
  updatedAt: Yup.string(),
  location: Yup.object()
    .shape({
      region: Yup.number(),
      coordinates: Yup.array(),
      address: Yup.string(),
    })
    .required(),
});

export type TypeEvent = Yup.InferType<typeof eventDTO>;

export interface Event extends Omit<TypeEvent, "category" | "createdBy"> {
  category: ObjectId;
  createdBy: ObjectId;
  taxPercentage?: number; // pajak
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    whatsapp?: string;
    telegram?: string;
    x?: string;
    website?: string;
    [key: string]: string | undefined; // fleksibel
  };
}

const EventSchema = new Schema<Event>(
  {
    name: {
      type: Schema.Types.String,
      required: true,
    },
    startDate: {
      type: Schema.Types.String,
      required: true,
    },
    endDate: {
      type: Schema.Types.String,
      required: true,
    },
    banner: {
      type: Schema.Types.String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    isFeatured: {
      type: Schema.Types.Boolean,
      required: true,
    },
    isOnline: {
      type: Schema.Types.Boolean,
      required: true,
    },
    isPublish: {
      type: Schema.Types.Boolean,
      default: false,
    },
    description: {
      type: Schema.Types.String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: ORGANIZER_MODEL_NAME,
    },
    slug: {
      type: Schema.Types.String,
      unique: true,
    },
    location: {
      type: {
        region: {
          type: Schema.Types.Number,
        },
        coordinates: {
          type: [Schema.Types.Number],
          default: [0, 0],
        },
        address: {
          type: Schema.Types.String,
        },
      },
    },
    taxPercentage: {
      type: Schema.Types.Number,
      default: 0,
    },
    socialMedia: {
      type: {
        instagram: { type: Schema.Types.String },
        facebook: { type: Schema.Types.String },
        tiktok: { type: Schema.Types.String },
        whatsapp: { type: Schema.Types.String },
        telegram: { type: Schema.Types.String },
        x: { type: Schema.Types.String },
        website: { type: Schema.Types.String },
      },
      default: {},
    },
  },
  {
    timestamps: true,
  }
).index({ name: "text" });

EventSchema.post("save", async function (doc, next) { 
  if (!this.slug) {
    const slug = this.name.split(" ").join("-").toLowerCase();
    this.slug = `${slug}`;
  }
  try {
    const event = doc;

    // Ambil semua user aktif
    const users = await UserModel.find({ isActive: true });

    for (const user of users) {
      // Render template email
      const contentMail = await renderMailHtml("event-notification.ejs", {
        fullName: user.fullName,
        username: user.username,
        eventName: event.name,
        eventDate: event.startDate,
        eventLink: `${CLIENT_HOST}/event/${event.slug}`,
      });

      // Kirim email
      await sendMail({
        from: EMAIL_SMTP_USER,
        to: user.email,
        subject: `Event Baru: ${event.name}`,
        html: contentMail,
      });

      console.log(
        `📧 Email dikirim ke ${user.email} untuk event ${event.name}`
      );
    }
  } catch (error) {
    console.log("Error sending event emails:", error);
  } finally {
    next();
  }
});

const EventModel = mongoose.model(EVENT_MODEL_NAME, EventSchema);

export default EventModel;
