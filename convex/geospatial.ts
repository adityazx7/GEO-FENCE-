import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { pickMessage } from "./aiMessagesHelpers";

export const calculateProximity = action({
    args: {
        citizenId: v.string(),
        citizenLat: v.number(),
        citizenLng: v.number(),
        speed: v.optional(v.number()), // speed in metres per second
    },
    handler: async (ctx, args) => {
        // 1. Speed filtering: If moving > 20km/h (approx 5.5 m/s)
        if (args.speed !== undefined && args.speed !== null && args.speed > 5.5) {
            console.log(`[Geospatial] Speed detected: ${args.speed.toFixed(2)} m/s (> 5.5 m/s). Skipping proximity check.`);
            return { success: true, triggered: false, speedFiltered: true };
        }

        const apiKey = process.env.GEOAPIFY_API_KEY;
        if (!apiKey) {
            console.warn("GEOAPIFY_API_KEY not found. Falling back to straight-line math.");
        }

        const projects = await ctx.runQuery(api.projects.list);
        let triggeredAnAlert = false;

        const userRecord = await ctx.runQuery(api.users.getUserByIdOrEmail, { idOrEmail: args.citizenId });
        if (!userRecord) return { success: false, error: "User not found" };

        // 2. Throttling: only check geofences every 30 seconds per user
        if (userRecord.lastGeofenceCheck && Date.now() - userRecord.lastGeofenceCheck < 30000) {
            return { success: true, triggered: false, throttled: true };
        }
        await ctx.scheduler.runAfter(0, api.users.updateGeofenceCheck, { userId: userRecord._id });

        const pushToken = userRecord.pushToken;
        const userFrequency = userRecord.notificationFrequency || "always";
        const userRadius = userRecord.notificationRadius || 500;
        const allowedTypes = userRecord.notificationTypes || ["planned", "in_progress", "completed"];
        const lastBatchAt = userRecord.lastBatchNotificationAt || 0;
        const segment = userRecord.segment || "Standard";
        const language = userRecord.preferredLanguage || "en";

        for (const project of projects) {
            if (!project.location) continue;
            if (!allowedTypes.includes(project.status)) continue;

            const targetLat = project.location.lat;
            const targetLng = project.location.lng;
            let distanceMeters = 0;

            if (apiKey) {
                try {
                    const url = `https://api.geoapify.com/v1/routing?waypoints=${args.citizenLat},${args.citizenLng}|${targetLat},${targetLng}&mode=walk&apiKey=${apiKey}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.features?.length > 0) {
                        distanceMeters = data.features[0].properties.distance;
                    } else {
                        throw new Error("No route");
                    }
                } catch (e) {
                    distanceMeters = calculateStraightLine(args.citizenLat, args.citizenLng, targetLat, targetLng);
                }
            } else {
                distanceMeters = calculateStraightLine(args.citizenLat, args.citizenLng, targetLat, targetLng);
            }

            // 4. Respect User Radius
            if (distanceMeters <= userRadius) {
                console.log(`CITIZEN ENTERED GEOFENCE for ${project.name} (${distanceMeters}m)`);
                triggeredAnAlert = true;

                // Analytics
                await ctx.runMutation(api.analytics.logEvent, {
                    eventType: "geofence_enter",
                    userId: args.citizenId,
                    metadata: JSON.stringify({ projectId: project._id, distance: distanceMeters })
                });

                // Get geofence details
                const geoFences = await ctx.runQuery(api.geoFences.listActive);
                const linkedFence = geoFences?.find((g: any) => g.linkedProjectId === project._id);
                if (linkedFence) {
                    await ctx.runMutation(api.projects.logGeofenceEntry, {
                        userId: args.citizenId,
                        geoFenceId: linkedFence._id,
                        geoFenceName: linkedFence.name,
                        geoFenceType: project.type,
                        projectId: project._id,
                        projectName: project.name,
                    });
                    await ctx.runMutation(api.geoFences.incrementTrigger, { id: linkedFence._id });
                }

                // AI Message Selection
                let aiBody = `You entered the ${project.name} zone.`;
                let aiTitle = `📍 ${project.name}`;
                
                if (project.aiMessages && project.messagesGenerated) {
                    const msg = pickMessage(project.aiMessages, segment, language, project.name);
                    aiTitle = msg.title;
                    aiBody = msg.body;
                }

                // Accountability Snippet
                let accSnippet = "";
                const accRecord = await ctx.runQuery(api.accountability.getByZone, { zoneId: String(project._id) });
                if (accRecord) {
                    accSnippet = ` | Official: ${accRecord.officialName}, ${accRecord.officialPost} | Status: ${accRecord.actualStatus} ${accRecord.txHash ? "✅ Blockchain verified" : "⏳ Pending"}`;
                }

                const finalBody = aiBody + accSnippet;

                const notificationId = await ctx.runMutation(api.notifications.sendUniqueProximityAlert, {
                    userId: args.citizenId,
                    projectId: project._id,
                    title: aiTitle,
                    content: finalBody,
                    language
                });

                if (notificationId) {
                    // Decide whether to push
                    let shouldPushNow = false;
                    const now = Date.now();

                    if (userFrequency === "always") {
                        shouldPushNow = true;
                    } else {
                        const thresholds: Record<string, number> = {
                            "1h": 60 * 60 * 1000,
                            "12h": 12 * 60 * 60 * 1000,
                            "1d": 24 * 60 * 60 * 1000
                        };
                        if (now - lastBatchAt >= (thresholds[userFrequency] || thresholds["1h"])) {
                            shouldPushNow = true;
                        }
                    }

                    if (shouldPushNow && pushToken && pushToken.startsWith('ExponentPushToken')) {
                        try {
                            await fetch('https://exp.host/--/api/v2/push/send', {
                                method: 'POST',
                                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: pushToken,
                                    title: aiTitle,
                                    body: finalBody,
                                    data: { screen: 'notifications', projectId: project._id },
                                    sound: 'default',
                                    priority: 'high',
                                }),
                            });
                            await ctx.runMutation(api.users.updateBatchTimer, { userId: userRecord._id });
                        } catch (e) {
                            console.warn("Push failed:", e);
                        }
                    }
                }
                break; // Stop checking after triggering the first one to avoid spam
            }
        }
        return { success: true, triggered: triggeredAnAlert };
    },
});

function calculateStraightLine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
