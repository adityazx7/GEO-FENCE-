import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const getUserByEmail = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args): Promise<Doc<"users"> | null> => {
        return await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .unique();
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
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
        await ctx.db.insert("verificationCodes", {
            email: args.email,
            code: args.code,
            expiresAt,
            used: false,
        });
    },
});
