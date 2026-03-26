import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const verifyEmail = mutation({
    args: { email: v.string(), code: v.string() },
    handler: async (ctx, args) => {
        const verification = await ctx.db.query("verificationCodes")
            .withIndex("by_email", q => q.eq("email", args.email))
            .filter(q => q.and(q.eq(q.field("code"), args.code), q.eq(q.field("used"), false)))
            .first();
            
        if (!verification || verification.expiresAt < Date.now()) {
            throw new Error("Invalid or expired verification code.");
        }
        
        await ctx.db.patch(verification._id, { used: true });
        
        const user = await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .unique();
            
        if (user) {
            await ctx.db.patch(user._id, { isVerified: true });
        }
    },
});
