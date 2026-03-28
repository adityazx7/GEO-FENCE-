import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const getUserByEmail = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args): Promise<Doc<"users"> | null> => {
        return await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .first(); // Use .first() to avoid crashing on duplicates
    },
});

export const createUser = internalMutation({
    args: {
        name: v.string(),
        email: v.string(),
        passwordHash: v.string(),
        userType: v.string(),
        state: v.string(),
        city: v.optional(v.string()),
        age: v.optional(v.number()),
        aadhaar: v.optional(v.string()),
        orgName: v.optional(v.string()),
        orgType: v.optional(v.string()),
        orgRegistrationNumber: v.optional(v.string()),
        orgContactPerson: v.optional(v.string()),
        orgWebsite: v.optional(v.string()),
        orgDescription: v.optional(v.string()),
        motherTongue: v.optional(v.string()),
        preferredLanguage: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<Id<"users">> => {
        return await ctx.db.insert("users", {
            ...args as any,
            role: "citizen",
            isVerified: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const saveVerificationCode = internalMutation({
    args: { email: v.string(), code: v.string() },
    handler: async (ctx, args): Promise<void> => {
        // 1. Check for resend cooldown (2 minutes)
        const lastCode = await ctx.db.query("verificationCodes")
            .withIndex("by_email", q => q.eq("email", args.email))
            .order("desc")
            .first();
            
        if (lastCode && (Date.now() - lastCode._creationTime) < 2 * 60 * 1000) {
            const remaining = Math.ceil((2 * 60 * 1000 - (Date.now() - lastCode._creationTime)) / 1000);
            throw new Error(`Please wait ${remaining} seconds before requesting a new code.`);
        }

        // 2. Insert new code with 2-minute expiry
        const expiresAt = Date.now() + 2 * 60 * 1000; // 2 mins
        await ctx.db.insert("verificationCodes", {
            email: args.email,
            code: args.code,
            expiresAt,
            used: false,
        });
    },
});

export const verifyAndSetPassword = internalMutation({
    args: { email: v.string(), code: v.string(), newPasswordHash: v.string() },
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
            
        if (!user) throw new Error("User not found.");
        
        await ctx.db.patch(user._id, { 
            passwordHash: args.newPasswordHash,
            updatedAt: Date.now() 
        });
    },
});
