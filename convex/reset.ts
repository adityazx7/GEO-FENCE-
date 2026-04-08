import { mutation } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

export const forceReset = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), args.email)).first();
    if (!user) throw new Error("User not found");
    
    const hash = bcrypt.hashSync(args.password, 10);
    await ctx.db.patch(user._id, { 
        passwordHash: hash,
        isVerified: true
    });
    return `Reset ${args.email} with new hash: ${hash.substring(0, 10)}...`;
  },
});
