import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        userId: v.string(),
        projectId: v.optional(v.id("projects")),
        location: v.object({ lat: v.number(), lng: v.number(), address: v.optional(v.string()) }),
        description: v.string(),
        category: v.union(v.literal("road_damage"), v.literal("water_leak"), v.literal("street_light"), v.literal("garbage"), v.literal("construction_delay"), v.literal("other")),
        aiCategory: v.optional(v.string()),
        aiSeverity: v.optional(v.number()),
        aiDescription: v.optional(v.string()),
        isSpam: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("issues", {
            ...args,
            status: "open",
            upvotes: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const updateTxHash = mutation({
    args: { issueId: v.id("issues"), txHash: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.issueId, { polygonTxHash: args.txHash });
    }
});

export const reportIssue = mutation({
    args: {
        userId: v.string(),
        location: v.object({
            lat: v.number(),
            lng: v.number(),
            address: v.optional(v.string()),
        }),
        description: v.string(),
        category: v.union(
            v.literal("road_damage"),
            v.literal("water_leak"),
            v.literal("street_light"),
            v.literal("garbage"),
            v.literal("construction_delay"),
            v.literal("other")
        ),
        images: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("issues", {
            ...args,
            status: "open",
            upvotes: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const getIssues = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("issues").order("desc").collect();
    },
});

export const toggleUpvote = mutation({
    args: { issueId: v.id("issues"), userId: v.string() },
    handler: async (ctx, args) => {
        const issue = await ctx.db.get(args.issueId);
        if (!issue) throw new Error("Issue not found");
        
        let upvotes = issue.upvotes || [];
        
        if (upvotes.includes(args.userId)) {
            upvotes = upvotes.filter(id => id !== args.userId);
        } else {
            upvotes.push(args.userId);
        }
        
        await ctx.db.patch(args.issueId, { upvotes, updatedAt: Date.now() });
    },
});

export const updateIssueStatus = mutation({
    args: {
        issueId: v.id("issues"),
        status: v.union(
            v.literal("open"),
            v.literal("in_progress"),
            v.literal("resolved"),
            v.literal("rejected")
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.issueId, {
            status: args.status,
            updatedAt: Date.now(),
        });
    },
});
