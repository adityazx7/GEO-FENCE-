import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const logEvent = mutation({
    args: {
        eventType: v.union(
            v.literal("geofence_enter"),
            v.literal("geofence_exit"),
            v.literal("notification_sent"),
            v.literal("notification_read"),
            v.literal("dashboard_view")
        ),
        geoFenceId: v.optional(v.id("geoFences")),
        userId: v.optional(v.string()),
        metadata: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("analyticsEvents", {
            ...args,
            timestamp: Date.now(),
        });
    },
});
