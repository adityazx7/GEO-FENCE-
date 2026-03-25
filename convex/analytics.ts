import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        const geoFences = await ctx.db.query("geoFences").collect();
        const totalTriggers = geoFences.reduce((acc, gf) => acc + (gf.triggerCount || 0), 0);
        
        const notifications = await ctx.db.query("notifications").collect();
        const totalNotifications = notifications.length;
        const notificationsToday = notifications.filter(n => {
            const date = new Date(n.createdAt);
            const today = new Date();
            return date.toDateString() === today.toDateString();
        }).length;

        const activeZones = geoFences.filter(gf => gf.status === "active").length;
        const pendingZones = geoFences.filter(gf => gf.status === "pending").length;

        const users = await ctx.db.query("users").collect();
        const totalCitizens = users.filter(u => u.role === "citizen").length;

        const booths = await ctx.db.query("booths").collect();
        const totalBooths = booths.length;
        const totalVoters = booths.reduce((acc, b) => acc + (b.totalVoters || 0), 0);

        return {
            totalTriggers,
            notifications: {
                total: totalNotifications,
                today: notificationsToday
            },
            activeZones: {
                count: activeZones,
                pending: pendingZones
            },
            totalCitizens,
            totalBooths,
            totalVoters
        };
    },
});

export const getWeeklyActivity = query({
    args: {},
    handler: async (ctx) => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        
        const analyticsEvents = await ctx.db
            .query("analyticsEvents")
            .withIndex("by_timestamp", (q) => q.gt("timestamp", sevenDaysAgo))
            .collect();

        const notifications = await ctx.db
            .query("notifications")
            .collect(); // In a real app, index by createdAt

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const activity = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            const dayName = days[date.getDay()];

            const dayTriggers = analyticsEvents.filter(e => 
                (e.eventType === "geofence_enter") && 
                new Date(e.timestamp).toDateString() === dateString
            ).length;

            const dayNotifications = notifications.filter(n => 
                new Date(n.createdAt).toDateString() === dateString
            ).length;

            activity.push({
                day: dayName,
                triggers: dayTriggers,
                notifications: dayNotifications
            });
        }

        return activity;
    },
});

export const getZoneActivity = query({
    args: {},
    handler: async (ctx) => {
        const geoFences = await ctx.db.query("geoFences").collect();
        const sorted = geoFences.sort((a, b) => b.triggerCount - a.triggerCount);
        
        const top4 = sorted.slice(0, 4);
        const totalTriggers = geoFences.reduce((acc, gf) => acc + gf.triggerCount, 0);

        return top4.map(gf => ({
            name: gf.name,
            triggers: gf.triggerCount,
            percentage: totalTriggers > 0 ? Math.round((gf.triggerCount / totalTriggers) * 100) : 0
        }));
    },
});

export const logEvent = mutation({
    args: {
        eventType: v.string(),
        userId: v.optional(v.string()),
        zoneId: v.optional(v.string()),
        metadata: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("analyticsEvents", {
            eventType: args.eventType as any,
            timestamp: Date.now(),
            metadata: args.metadata,
        });
    },
});
