import mongoose from "mongoose";

export const EVENT_ACCESS_MODEL_NAME = "EventAccess";

const Schema = mongoose.Schema;

const EventAccessSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "editor", "viewer"], // bisa fleksibel sesuai kebutuhan
      default: "viewer",
    },
    permissions: {
      type: [String], // contoh: ["manage_tickets", "manage_lineups", "view_reports"]
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const EventAccessModel = mongoose.model(
  EVENT_ACCESS_MODEL_NAME,
  EventAccessSchema
);

export default EventAccessModel;
