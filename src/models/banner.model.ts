import mongoose, { Schema } from "mongoose";
import * as Yup from "yup";

export const BANNER_MODEL_NAME = "Banner";

export const bannerDTO = Yup.object({
  title: Yup.string().required(),
  image: Yup.string().required(),
  isShow: Yup.boolean().required(),
});

export type TypeBanner = Yup.InferType<typeof bannerDTO>;

interface Banner extends TypeBanner {}

const BannerSchema = new Schema<Banner>(
  {
    title: {
      type: Schema.Types.String,
      required: true,
    },
    image: {
      type: Schema.Types.String,
      required: true,
    },
    isShow: {
      type: Schema.Types.Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
).index({ title: "text" });

const BannerModel = mongoose.model(BANNER_MODEL_NAME, BannerSchema);
export default BannerModel;
