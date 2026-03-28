import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

export const getDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        const projects = await ctx.db.query("projects").collect();
        const users = await ctx.db.query("users").collect();
        const entries = await ctx.db.query("geofenceEntries").collect();
        const fences = await ctx.db.query("geoFences").collect();
        const notifications = await ctx.db.query("notifications").collect();
        const accountabilityRecords = await ctx.db.query("accountabilityRecords").collect();

        const citizenCount = users.filter(u => u.userType === "citizen").length;
        const activeFences = fences.filter(f => f.status === "active").length;

        // Calculate notification stats
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        const todayNotifications = notifications.filter(n => n.createdAt >= startOfToday).length;

        const totalVoters = citizenCount;

        // Calculate total triggers (sum of triggerCount in geoFences)
        const totalTriggers = fences.reduce((sum, f) => sum + (f.triggerCount || 0), 0);

        const recentActivity = await ctx.db
            .query("geofenceEntries")
            .order("desc")
            .take(5);

        return {
            totalProjects: projects.length,
            totalCitizens: citizenCount,
            totalEntries: entries.length,
            activeGeofences: activeFences,
            totalTriggers,
            totalBooths: 0,
            totalVoters,
            totalNotifications: notifications.length,
            totalAccountabilityRecords: accountabilityRecords.length,
            notifications: {
                total: notifications.length,
                today: todayNotifications
            },
            recentActivity,
            // Added for the Analytics page compatibility
            activeZones: {
                count: activeFences,
                pending: fences.filter(f => f.status === "pending").length
            }
        };
    },
});

export const getWeeklyActivity = query({
    args: {},
    handler: async (ctx) => {
        const entries = await ctx.db.query("geofenceEntries").collect();
        const notifications = await ctx.db.query("notifications").collect();
        
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const now = new Date();
        const activity = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const dayEntries = entries.filter(e => e.enteredAt >= d.getTime() && e.enteredAt < nextD.getTime());
            const dayNotifications = notifications.filter(n => n.createdAt >= d.getTime() && n.createdAt < nextD.getTime());

            activity.push({
                day: days[d.getDay()],
                triggers: dayEntries.length,
                notifications: dayNotifications.length,
            });
        }

        return activity;
    },
});

export const getZoneActivity = query({
    args: {},
    handler: async (ctx) => {
        const fences = await ctx.db.query("geoFences").collect();
        const totalTriggers = fences.reduce((sum, f) => sum + (f.triggerCount || 0), 0);

        return fences
            .sort((a, b) => (b.triggerCount || 0) - (a.triggerCount || 0))
            .slice(0, 5)
            .map(f => ({
                name: f.name,
                triggers: f.triggerCount || 0,
                percentage: totalTriggers > 0 ? Math.round(((f.triggerCount || 0) / totalTriggers) * 100) : 0,
            }));
    },
});
