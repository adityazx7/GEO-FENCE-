import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncUser = mutation({
    args: {
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        role: v.optional(v.union(v.literal("admin"), v.literal("citizen"), v.literal("operator"))),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                email: args.email,
                avatar: args.avatar,
                updatedAt: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert("users", {
            clerkId: args.clerkId,
            name: args.name,
            email: args.email,
            role: args.role ?? "citizen",
            userType: "citizen",
            isVerified: true,
            avatar: args.avatar,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const getUser = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();
    },
});

export const updateLocation = mutation({
    args: {
        clerkId: v.string(),
        lat: v.number(),
        lng: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, {
                location: { lat: args.lat, lng: args.lng },
                updatedAt: Date.now(),
            });
        }
    },
});

export const listUsers = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});
export const isAdmin = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();
        return user?.role === "admin" || user?.role === "operator";
    },
});

export const updateGeofenceCheck = mutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        let user: any = null;
        try {
            if (args.userId.includes(":")) { // Convex ID format often CID:... or similar but really it's just a string in Convex
                 user = await ctx.db.get(args.userId as any);
            }
        } catch(e) {}
        
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_email", q => q.eq("email", args.userId))
                .unique();
        }
        
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_clerkId", q => q.eq("clerkId", args.userId))
                .unique();
        }

        if (user) {
            await ctx.db.patch(user._id, {
                lastGeofenceCheck: Date.now(),
                updatedAt: Date.now(),
            });
        }
    },
});

export const updatePreferences = mutation({
    args: {
        userId: v.string(), // clerkId or email
        notificationFrequency: v.optional(v.union(v.literal("1d"), v.literal("12h"), v.literal("1h"), v.literal("always"))),
        notificationRadius: v.optional(v.number()),
        notificationTypes: v.optional(v.array(v.string())),
        name: v.optional(v.string()),
        preferredLanguage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let user: any = null;
        try {
            user = await ctx.db.get(args.userId as any);
        } catch(e) {}
        
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_email", q => q.eq("email", args.userId))
                .unique();
        }
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_clerkId", q => q.eq("clerkId", args.userId))
                .unique();
        }

        if (user) {
            const patch: any = { updatedAt: Date.now() };
            if (args.notificationFrequency !== undefined) patch.notificationFrequency = args.notificationFrequency;
            if (args.notificationRadius !== undefined) patch.notificationRadius = args.notificationRadius;
            if (args.notificationTypes !== undefined) patch.notificationTypes = args.notificationTypes;
            if (args.name !== undefined) patch.name = args.name;
            if (args.preferredLanguage !== undefined) patch.preferredLanguage = args.preferredLanguage;

            await ctx.db.patch(user._id, patch);
        } else {
            throw new Error("User not found to update preferences");
        }
    },
});

export const updateBatchTimer = mutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        let user: any = null;
        try {
            user = await ctx.db.get(args.userId as any);
        } catch(e) {}
        
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_email", q => q.eq("email", args.userId))
                .unique();
        }
        
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_clerkId", q => q.eq("clerkId", args.userId))
                .unique();
        }

        if (user) {
            await ctx.db.patch(user._id, {
                lastBatchNotificationAt: Date.now(),
                updatedAt: Date.now(),
            });
        }
    },
});

// Public query: used by AuthContext to subscribe live to the user record
export const getUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        if (!args.email) return null;
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});

