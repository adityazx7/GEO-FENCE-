import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const send = mutation({
    args: {
        userId: v.optional(v.string()),
        geoFenceId: v.optional(v.id("geoFences")),
        projectId: v.optional(v.id("projects")),
        title: v.string(),
        content: v.string(),
        type: v.union(
            v.literal("governance_update"),
            v.literal("project_milestone"),
            v.literal("proximity_alert"),
            v.literal("system")
        ),
        language: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("notifications", {
            ...args,
            status: "sent",
            createdAt: Date.now(),
        });
    },
});

export const sendUniqueProximityAlert = mutation({
    args: {
        userId: v.string(),
        projectId: v.id("projects"),
        title: v.string(),
        content: v.string(),
        language: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Check if user already read this project
        const readInteraction = await ctx.db
            .query("interactions")
            .withIndex("by_user_project", (q) => 
                q.eq("userId", args.userId).eq("projectId", args.projectId)
            )
            .filter((q) => q.eq(q.field("type"), "read"))
            .unique();
        
        if (readInteraction) return null;

        // 2. Check for recent unread alert for this same project
        const existingNotif = await ctx.db
            .query("notifications")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) => 
                q.and(
                    q.eq(q.field("projectId"), args.projectId),
                    q.eq(q.field("status"), "sent"),
                    q.eq(q.field("type"), "proximity_alert")
                )
            )
            .first();
        
        if (existingNotif) return null;

        // 3. Send if unique
        return await ctx.db.insert("notifications", {
            userId: args.userId,
            projectId: args.projectId,
            title: args.title,
            content: args.content,
            type: "proximity_alert",
            status: "sent",
            language: args.language,
            createdAt: Date.now(),
        });
    },
});

export const listForUser = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("notifications")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("notifications")
            .order("desc")
            .take(100);
    },
});

export const markRead = mutation({
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: "read" });
    },
});

export const markAllRead = mutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("status"), "sent"))
            .collect();

        for (const n of notifications) {
            await ctx.db.patch(n._id, { status: "read" });
        }
    },
});

export const deleteAllForUser = mutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();

        for (const n of notifications) {
            await ctx.db.delete(n._id);
        }
    },
});

export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const all = await ctx.db.query("notifications").collect();
        const sent = all.filter((n) => n.status === "sent").length;
        const delivered = all.filter((n) => n.status === "delivered").length;
        const read = all.filter((n) => n.status === "read").length;
        return { total: all.length, sent, delivered, read };
    },
});
