import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Uses Geoapify Routing API to get real-world driving/walking distance between two lat/lng points
// This replaces the mock triggers with actual geospatial logic.
export const calculateProximity = action({
    args: {
        citizenId: v.string(),
        citizenLat: v.number(),
        citizenLng: v.number(),
        speed: v.optional(v.number()), // speed in metres per second
    },
    handler: async (ctx, args) => {
        // Speed filtering: If moving > 20km/h (approx 5.5 m/s), skip notifications
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

        // 1. Resolve the user record
        const allUsers = await ctx.runQuery(api.users.listUsers);
        const userRecord = allUsers?.find((u: any) => u._id === args.citizenId || u.email === args.citizenId || u.clerkId === args.citizenId);
        
        // 2. Throttling: only check geofences every 30 seconds per user
        if (userRecord?.lastGeofenceCheck && Date.now() - userRecord.lastGeofenceCheck < 30000) {
            // console.log(`Geofence check throttled for ${args.citizenId}`);
            return { success: true, triggered: false, throttled: true };
        }
        
        // Update the timestamp early to prevent races from multiple quick pings
        await ctx.runMutation(api.users.updateGeofenceCheck, { userId: args.citizenId });

        const pushToken: string | undefined = userRecord?.pushToken;
        const userFrequency = userRecord?.notificationFrequency || "always";
        const userRadius = userRecord?.notificationRadius || 500;
        const allowedTypes = userRecord?.notificationTypes || ["planned", "in_progress", "completed"];
        const lastBatchAt = userRecord?.lastBatchNotificationAt || 0;

        for (const project of projects) {
            if (!project.location) continue;
            
            // 3. Status Filter: Only notify if status is allowed by user
            if (!allowedTypes.includes(project.status)) continue;

            // ... (distance calculation logic)
            const targetLat = project.location.lat;
            const targetLng = project.location.lng;
            let distanceMeters = 0;

            if (apiKey) {
                try {
                    const url = `https://api.geoapify.com/v1/routing?waypoints=${args.citizenLat},${args.citizenLng}|${targetLat},${targetLng}&mode=walk&apiKey=${apiKey}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.features && data.features.length > 0) {
                        distanceMeters = data.features[0].properties.distance;
                    } else {
                        throw new Error("No route found in Geoapify");
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

                // 1. Log analytics event
                await ctx.runMutation(api.analytics.logEvent, {
                    eventType: "geofence_enter",
                    userId: args.citizenId,
                    metadata: JSON.stringify({ projectId: project._id, distance: distanceMeters })
                });

                // 2. Log to geofenceEntries table (for the Recent box)
                // We log this regardless of batching so it shows up in their "inbox" UI
                try {
                    const geoFences = await ctx.runQuery(api.geoFences.list);
                    const linked = geoFences?.find((g: any) => g.linkedProjectId === project._id);
                    if (linked) {
                        await ctx.runMutation(api.projects.logGeofenceEntry, {
                            userId: args.citizenId,
                            geoFenceId: linked._id,
                            geoFenceName: linked.name || project.name, // The unique geofence name as title
                            geoFenceType: project.type,
                            projectId: project._id,
                            projectName: project.name, // The overall project name as subtitle
                        });
                    }
                } catch (e) {
                    console.warn("Could not log geofence entry:", e);
                }

                // 3. Unified Notification Logic (Batching & Throttling)
                const rawLang = userRecord?.preferredLanguage || userRecord?.motherTongue || "English";
                const prefLang = rawLang.trim();
                
                // Fetch geofence to get trigger stats for analytical notification
                const geoFences = await ctx.runQuery(api.geoFences.list);
                const linkedFence = geoFences?.find((g: any) => g.linkedProjectId === project._id);
                const triggerCount = linkedFence?.triggerCount || 0;
                
                let content = `You've entered the ${linkedFence?.name || project.name} zone. This area has been visited ${triggerCount} times by citizens.`;
                
                if (prefLang.toLowerCase() !== "english") {
                    try {
                        content = await ctx.runAction(api.ai.translateText, { text: content, targetLanguage: prefLang });
                    } catch (e) {}
                }

                // This mutation checks for strict duplicates!
                const notificationId = await ctx.runMutation(api.notifications.sendUniqueProximityAlert, {
                    userId: args.citizenId,
                    projectId: project._id,
                    title: project.name,
                    content: content,
                    language: prefLang
                });

                // If it's a NEW notification, decide whether to PUSH it based on frequency
                if (notificationId) {
                    await ctx.runMutation(api.geoFences.incrementByProjectId, { projectId: project._id });

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
                        const waitTime = thresholds[userFrequency] || thresholds["1h"];
                        if (now - lastBatchAt >= waitTime) {
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
                                    title: `📍 ${project.name}`,
                                    body: content,
                                    data: { screen: 'notifications' },
                                    sound: 'default',
                                    priority: 'high',
                                }),
                            });
                            // Reset the timer since we just sent a push
                            await ctx.runMutation(api.users.updateBatchTimer, { userId: args.citizenId });
                        } catch (e) {
                            console.warn("Push failed:", e);
                        }
                    }

                    break; // One alert processed per check
                }
            }
        }

        return { success: true, triggered: triggeredAnAlert };
    },
});

// Haversine formula for straight-line distance if API fails
function calculateStraightLine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
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
