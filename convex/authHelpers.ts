import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

// ====== QUERIES & MUTATIONS for auth ======

export const getUserByEmail = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const users = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .collect();
        
        if (users.length === 0) return null;
        if (users.length === 1) return users[0];

        // If duplicates exist, pick the one that is verified, or the most recently updated
        return users.sort((a, b) => {
            if (a.isVerified && !b.isVerified) return -1;
            if (!a.isVerified && b.isVerified) return 1;
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        })[0];
    },
});

export const verifyEmail = mutation({
    args: {
        email: v.string(),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("verificationCodes")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .collect();

        const valid = records.find(
            (r) => r.code === args.code && !r.used && r.expiresAt > Date.now()
        );

        if (!valid) {
            throw new Error("Invalid or expired verification code.");
        }

        // Mark code as used
        await ctx.db.patch(valid._id, { used: true });

        // Set user as verified
        const users = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .collect();
        const user = users.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];

        if (user) {
            await ctx.db.patch(user._id, { isVerified: true, updatedAt: Date.now() });
        }

        return { success: true };
    },
});

export const seedUser = internalMutation({
    args: {
        name: v.string(),
        email: v.string(),
        passwordHash: v.string(),
        userType: v.union(v.literal("citizen"), v.literal("organization")),
        role: v.union(v.literal("admin"), v.literal("citizen"), v.literal("operator")),
        state: v.string(),
        city: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("users", {
            ...args,
            isVerified: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const insertUser = internalMutation({
    args: {
        name: v.string(),
        email: v.string(),
        passwordHash: v.string(),
        userType: v.union(v.literal("citizen"), v.literal("organization")),
        role: v.union(v.literal("admin"), v.literal("citizen"), v.literal("operator")),
        state: v.string(),
        city: v.optional(v.string()),
        age: v.optional(v.number()),
        aadhaar: v.optional(v.string()),
        orgName: v.optional(v.string()),
        orgType: v.optional(v.union(
            v.literal("ngo"), v.literal("government"),
            v.literal("private"), v.literal("trust"), v.literal("other")
        )),
        orgRegistrationNumber: v.optional(v.string()),
        orgContactPerson: v.optional(v.string()),
        orgWebsite: v.optional(v.string()),
        orgDescription: v.optional(v.string()),
        preferredLanguage: v.optional(v.string()),
        motherTongue: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("users", {
            ...args,
            isVerified: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const completeRegistration = internalMutation({
    args: {
        userData: v.any(),
        verificationCode: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        // Double check email uniqueness inside the transaction
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.userData.email))
            .first();
        
        if (existing) {
            throw new Error("An account with this email already exists.");
        }

        const userId = await ctx.db.insert("users", {
            ...args.userData,
            isVerified: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("verificationCodes", {
            email: args.userData.email,
            code: args.verificationCode,
            expiresAt: args.expiresAt,
            used: false,
        });

        return userId;
    },
});

export const insertVerificationCode = internalMutation({
    args: {
        email: v.string(),
        code: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("verificationCodes", {
            ...args,
            used: false,
        });
    },
});
