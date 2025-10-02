import mongoose, { Schema } from "mongoose";
import * as Yup from "yup";
import { EVENT_MODEL_NAME } from "./event.model";

export const LINEUP_MODEL_NAME = "Lineup";

export const lineupDTO = Yup.object({
  urut: Yup.number().required(),
  foto: Yup.string().required(),
  nama: Yup.string().required(),
  sosialmedia: Yup.string().required(),
  isActive: Yup.boolean().default(true),
});

export type TypeLineup = Yup.InferType<typeof lineupDTO>;

interface Lineup extends Omit<TypeLineup, "events"> {
  events: Schema.Types.ObjectId;
}

const LineupSchema = new Schema<Lineup>(
  {
    urut: {
      type: Schema.Types.Number,
      required: true,
    },
    nama: {
      type: Schema.Types.String,
      required: true,
    },
    foto: {
      type: Schema.Types.String,
      required: true,
    },
    events: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: EVENT_MODEL_NAME,
    },
    sosialmedia: {
      type: Schema.Types.String,
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
).index({ name: "text" });

const LineupModel = mongoose.model(LINEUP_MODEL_NAME, LineupSchema);
export default LineupModel;
