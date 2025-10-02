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

export const USER_MODEL_NAME = "User";

export const userLoginDTO = Yup.object({
  identifier: Yup.string().required(),
  password: validatePassword,
});

export const userUpdatePasswordDTO = Yup.object({
  oldPassword: validatePassword,
  password: validatePassword,
  confirmPassword: validateConfirmPassword,
});

export const userDTO = Yup.object({
  fullName: Yup.string().required(),
  username: Yup.string().required(),
  email: Yup.string().email().required(),
  password: validatePassword,
  confirmPassword: validateConfirmPassword,
});

export const userAddDTO = Yup.object({
  fullName: Yup.string().required(),
  username: Yup.string().required(),
  email: Yup.string().email().required(),
  password: validatePassword,
  confirmPassword: validateConfirmPassword,
  role: Yup.string()
    .oneOf([ROLES.ADMIN, ROLES.ORGANIZER, ROLES.MEMBER])
    .required("Role harus dipilih"),
});
export const resetPasswordDTO = Yup.object({
  password: validatePassword,
  confirmPassword: Yup.string()
    .required("Confirm Password is required")
    .oneOf([Yup.ref("password")], "Passwords must match"),
  token: Yup.string().required("Token is required"),
});

export type TypeUser = Yup.InferType<typeof userDTO>;

export interface User extends Omit<TypeUser, "confirmPassword"> {
  isActive: boolean;
  activationCode: string;
  role: string;
  profilePicture: string;
  resetPasswordToken?: string | null; // <-- tambahkan ini
  resetPasswordExpires?: Date | null; // <-- tambahkan ini
  createdAt?: string;
  isProfileComplete: boolean;
  gender?: "Laki-laki" | "Perempuan" | null;
  nohp?: string | null;
}

const Schema = mongoose.Schema;

const UserSchema = new Schema<User>(
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
      enum: [ROLES.ADMIN, ROLES.ORGANIZER, ROLES.MEMBER],
      default: ROLES.MEMBER,
    },
    profilePicture: {
      type: Schema.Types.String,
      default: null,
    },
    isActive: {
      type: Schema.Types.Boolean,
      default: false,
    },
    isProfileComplete: {
      type: Schema.Types.Boolean,
      default: false,
    },
    activationCode: {
      type: Schema.Types.String,
    },
    gender: {
      type: Schema.Types.String,
      enum: ["Laki-laki", "Perempuan"],
      default: null,
    },
    nohp: {
      type: Schema.Types.String,
      default: null,
    },
    resetPasswordToken: { type: Schema.Types.String, default: null },
    resetPasswordExpires: { type: Schema.Types.Date, default: null },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", function (next) {
  const user = this;
  user.password = encrypt(user.password);
  user.activationCode = encrypt(user.id);
  next();
});

UserSchema.post("save", async function (doc, next) {
  try {
    const user = doc;
    console.log("Send Email to: ", user);
    const contentMail = await renderMailHtml("registration-success.ejs", {
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      activationLink: `${CLIENT_HOST}/auth/activation?code=${user.activationCode}`,
    });
    await sendMail({
      from: EMAIL_SMTP_USER,
      to: user.email,
      subject: "Aktivasi Akun Anda",
      html: contentMail,
    });
  } catch (error) {
    console.log(error);
  } finally {
    next();
  }
});

UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.activationCode;
  return user;
};

const UserModel = mongoose.model(USER_MODEL_NAME, UserSchema);

export default UserModel;
