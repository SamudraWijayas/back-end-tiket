import mongoose from "mongoose";
import { encrypt } from "../utils/encryption";

import { renderMailHtml, sendMail } from "../utils/mail/mail";
import { CLIENT_HOST, EMAIL_SMTP_USER } from "../utils/env";
import { ROLES } from "../utils/constant";
import * as Yup from "yup";

const validatePassword = Yup.string()
  .required()
  .min(6, "Password must be at least 6 characters")
  .test(
    "at-least-one-uppercase-letter",
    "Contains at least one uppercase letter",
    (value) => {
      if (!value) return false;
      const regex = /^(?=.*[A-Z])/;
      return regex.test(value);
    }
  )
  .test(
    "at-least-one-number",
    "Contains at least one uppercase letter",
    (value) => {
      if (!value) return false;
      const regex = /^(?=.*\d)/;
      return regex.test(value);
    }
  );
const validateConfirmPassword = Yup.string()
  .required()
  .oneOf([Yup.ref("password"), ""], "Password not match");

export const ORGANIZER_MODEL_NAME = "Organizer";

export const organizerLoginDTO = Yup.object({
  identifier: Yup.string().required(),
  password: validatePassword,
});

export const organizerUpdatePasswordDTO = Yup.object({
  oldPassword: validatePassword,
  password: validatePassword,
  confirmPassword: validateConfirmPassword,
});

export const organizerDTO = Yup.object({
  fullName: Yup.string().required(),
  username: Yup.string().required(),
  email: Yup.string().email().required(),
  password: validatePassword,
  confirmPassword: validateConfirmPassword,
});


export const resetPasswordDTO = Yup.object({
  password: validatePassword,
  confirmPassword: Yup.string()
    .required("Confirm Password is required")
    .oneOf([Yup.ref("password")], "Passwords must match"),
  token: Yup.string().required("Token is required"),
});

export type TypeOrganizer = Yup.InferType<typeof organizerDTO>;

export interface Organizer extends Omit<TypeOrganizer, "confirmPassword"> {
  isActive: boolean;
  activationCode: string;
  role: string;
  profilePicture: string;
  resetPasswordToken?: string | null; // <-- tambahkan ini
  resetPasswordExpires?: Date | null; // <-- tambahkan ini
  createdAt?: string;
}

const Schema = mongoose.Schema;

const OrganizerSchema = new Schema<Organizer>(
  {
    fullName: {
      type: Schema.Types.String,
      required: true,
    },
    username: {
      type: Schema.Types.String,
      required: true,
      unique: true,
    },
    email: {
      type: Schema.Types.String,
      required: true,
      unique: true,
    },
    password: {
      type: Schema.Types.String,
      required: true,
    },
    role: {
      type: Schema.Types.String,
      enum: [ROLES.ORGANIZER],
      default: ROLES.ORGANIZER,
    },
    profilePicture: {
      type: Schema.Types.String,
      default: null,
    },
    isActive: {
      type: Schema.Types.Boolean,
      default: false,
    },
    activationCode: {
      type: Schema.Types.String,
    },
    resetPasswordToken: { type: Schema.Types.String, default: null },
    resetPasswordExpires: { type: Schema.Types.Date, default: null },
  },
  {
    timestamps: true,
  }
);

OrganizerSchema.pre("save", function (next) {
  const organizer = this;
  organizer.password = encrypt(organizer.password);
  organizer.activationCode = encrypt(organizer.id);
  next();
});

OrganizerSchema.post("save", async function (doc, next) {
  try {
    const organizer = doc;
    console.log("Send Email to: ", organizer);
    const contentMail = await renderMailHtml("registration-success.ejs", {
      username: organizer.username,
      fullName: organizer.fullName,
      email: organizer.email,
      createdAt: organizer.createdAt,
      activationLink: `${CLIENT_HOST}/auth/activation?code=${organizer.activationCode}`,
    });
    await sendMail({
      from: EMAIL_SMTP_USER,
      to: organizer.email,
      subject: "Aktivasi Akun Anda",
      html: contentMail,
    });
  } catch (error) {
    console.log(error);
  } finally {
    next();
  }
});

OrganizerSchema.methods.toJSON = function () {
  const organizer = this.toObject();
  delete organizer.password;
  delete organizer.activationCode;
  return organizer;
};

const OrganizerModel = mongoose.model(ORGANIZER_MODEL_NAME, OrganizerSchema);

export default OrganizerModel;
