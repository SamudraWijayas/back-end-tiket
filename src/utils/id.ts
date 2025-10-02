import { customAlphabet } from "nanoid";

export const getId = (): string => {
  const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 10);
  return nanoid(15);
};
