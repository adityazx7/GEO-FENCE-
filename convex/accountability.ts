import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Create a blockchain-anchored accountability record for a government project
export const createRecord = mutation({
  args: {
    zoneId: v.string(),
    zoneName: v.string(),
    officialName: v.string(),
    officialPost: v.string(),
    partyName: v.string(),
    projectClaim: v.string(),
    startDate: v.string(),
    claimedCompletionDate: v.string(),
    actualStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("accountabilityRecords")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
      .first();
    if (existing) return { recordId: existing._id, dataHash: existing.dataHash, skipped: true };

    const payload = JSON.stringify({
      zoneName: args.zoneName,
      officialName: args.officialName,
      officialPost: args.officialPost,
      partyName: args.partyName,
      projectClaim: args.projectClaim,
      startDate: args.startDate,
      claimedCompletionDate: args.claimedCompletionDate,
    });
    const dataHash = await sha256(payload);

    const recordId = await ctx.db.insert("accountabilityRecords", {
      ...args,
      dataHash,
      createdAt: Date.now(),
    });
    return { recordId, dataHash, skipped: false };
  },
});

export const updateTxHash = mutation({
  args: {
    recordId: v.id("accountabilityRecords"),
    txHash: v.string(),
    explorerUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recordId, {
      txHash: args.txHash,
      explorerUrl: args.explorerUrl,
    });
  },
});

export const getByZone = query({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("accountabilityRecords")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
      .first();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("accountabilityRecords").order("desc").take(50);
  },
});
