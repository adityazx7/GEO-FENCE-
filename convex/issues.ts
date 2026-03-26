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
        description: v.string(),
        category: v.union(
            v.literal("road_damage"),
            v.literal("water_leak"),
            v.literal("street_light"),
            v.literal("garbage"),
            v.literal("other")
        ),
        images: v.optional(v.array(v.string())),
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
        return await ctx.db.query("issues").order("desc").collect();
    },
});

export const toggleUpvote = mutation({
    args: { issueId: v.id("issues"), userId: v.string() },
    handler: async (ctx, args) => {
        const issue = await ctx.db.get(args.issueId);
        if (!issue) throw new Error("Issue not found");
        
        let upvotes = issue.upvotes || [];
        let downvotes = issue.downvotes || [];
        
        if (upvotes.includes(args.userId)) {
            upvotes = upvotes.filter(id => id !== args.userId);
        } else {
            upvotes.push(args.userId);
            downvotes = downvotes.filter(id => id !== args.userId);
        }
        
        await ctx.db.patch(args.issueId, { upvotes, downvotes, updatedAt: Date.now() });
    },
});

export const toggleDownvote = mutation({
    args: { issueId: v.id("issues"), userId: v.string() },
    handler: async (ctx, args) => {
        const issue = await ctx.db.get(args.issueId);
        if (!issue) throw new Error("Issue not found");
        
        let upvotes = issue.upvotes || [];
        let downvotes = issue.downvotes || [];
        
        if (downvotes.includes(args.userId)) {
            downvotes = downvotes.filter(id => id !== args.userId);
        } else {
            downvotes.push(args.userId);
            upvotes = upvotes.filter(id => id !== args.userId);
        }
        
        await ctx.db.patch(args.issueId, { upvotes, downvotes, updatedAt: Date.now() });
    },
});
