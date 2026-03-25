import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const reportIssue = mutation({
    args: {
        userId: v.string(),
        location: v.object({
            lat: v.number(),
            lng: v.number(),
            address: v.optional(v.string()),
        }),
        images: v.optional(v.array(v.string())),
        description: v.string(),
        category: v.union(
            v.literal("road_damage"),
            v.literal("water_leak"),
            v.literal("street_light"),
            v.literal("garbage"),
            v.literal("other")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("issues", {
            ...args,
            status: "open",
            upvotes: [],
            downvotes: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const getIssues = query({
    args: {},
    handler: async (ctx) => {
        const issues = await ctx.db.query("issues").order("desc").collect();
        return issues;
    },
});

export const updateIssueStatus = mutation({
    args: {
        issueId: v.id("issues"),
        status: v.union(
            v.literal("open"),
            v.literal("in-progress"),
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
export const toggleUpvote = mutation({
    args: { issueId: v.id("issues"), userId: v.string() },
    handler: async (ctx, args) => {
        const issue = await ctx.db.get(args.issueId);
        if (!issue) return;
        const upvotes = issue.upvotes || [];
        const downvotes = issue.downvotes || [];
        if (upvotes.includes(args.userId)) {
            await ctx.db.patch(args.issueId, { upvotes: upvotes.filter(id => id !== args.userId) });
        } else {
            await ctx.db.patch(args.issueId, { 
                upvotes: [...upvotes, args.userId],
                downvotes: downvotes.filter(id => id !== args.userId)
            });
        }
    },
});

export const toggleDownvote = mutation({
    args: { issueId: v.id("issues"), userId: v.string() },
    handler: async (ctx, args) => {
        const issue = await ctx.db.get(args.issueId);
        if (!issue) return;
        const upvotes = issue.upvotes || [];
        const downvotes = issue.downvotes || [];
        if (downvotes.includes(args.userId)) {
            await ctx.db.patch(args.issueId, { downvotes: downvotes.filter(id => id !== args.userId) });
        } else {
            await ctx.db.patch(args.issueId, { 
                downvotes: [...downvotes, args.userId],
                upvotes: upvotes.filter(id => id !== args.userId)
            });
        }
    },
});
