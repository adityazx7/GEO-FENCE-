import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOffset = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("syncState").withIndex("by_key", (q) => q.eq("key", "ogd_offset")).first();
    return state?.value ?? 0;
  },
});

export const updateOffset = mutation({
  args: { newOffset: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("syncState").withIndex("by_key", (q) => q.eq("key", "ogd_offset")).first();
    if (existing) await ctx.db.patch(existing._id, { value: args.newOffset });
    else await ctx.db.insert("syncState", { key: "ogd_offset", value: args.newOffset });
  },
});
