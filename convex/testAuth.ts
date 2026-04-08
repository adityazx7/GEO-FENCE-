"use node";
import { action } from "./_generated/server";
import bcrypt from "bcryptjs";

export const testBcrypt = action({
  args: {},
  handler: async (ctx) => {
    const password = "password";
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const isValid = await bcrypt.compare(password, hash);
    return { hash, isValid };
  },
});
