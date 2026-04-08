import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Bharat Mandapam (IECC)
        const project1Id = await ctx.db.insert("projects", {
            name: "Bharat Mandapam (IECC) Official",
            description: "Bharat Mandapam at Pragati Maidan - India's flagship international convention center. Official venue for the G20 summit and center of national civic pride.",
            type: "government_office",
            status: "completed",
            budget: 27000000000, // ₹2,700 Cr approx
            impact: "A world-class infrastructure that boosts India's MICE (Meetings, Incentives, Conferences, and Exhibitions) sector.",
            location: { lat: 28.6139, lng: 77.2421, address: "Pragati Maidan, New Delhi, Delhi 110001" },
            authorName: "ITPO India",
            areaImpact: "Central Delhi Civic Corridor",
            messagesGenerated: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("geoFences", {
            name: "Bharat Mandapam IECC Zone",
            type: "government_office",
            status: "active",
            center: { lat: 28.6139, lng: 77.2421 },
            radius: 800,
            linkedProjectId: project1Id,
            triggerCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // 2. Supreme Court / Pragati Maidan Metro
        const project2Id = await ctx.db.insert("projects", {
            name: "Supreme Court Metro Hub",
            description: "Upgradation of the multi-modal transport hub at Supreme Court (Pragati Maidan) Metro station to handle IECC traffic.",
            type: "metro",
            status: "in_progress",
            budget: 450000000, 
            impact: "Provides seamless connectivity for over 1.5 lakh daily commuters and tourists visiting the Bharat Mandapam complex.",
            location: { lat: 28.6180, lng: 77.2405, address: "Mathura Road, Delhi 110001" },
            authorName: "DMRC",
            areaImpact: "Pragati Maidan Transport Link",
            messagesGenerated: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("geoFences", {
            name: "Pragati Maidan Metro Zone",
            type: "metro",
            status: "active",
            center: { lat: 28.6180, lng: 77.2405 },
            radius: 500,
            linkedProjectId: project2Id,
            triggerCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // 3. Mathura Road Tunnel & Overpass
        const project3Id = await ctx.db.insert("projects", {
            name: "Mathura Road Integrated Transit Corridor",
            description: "Construction of the integrated transit corridor and tunnels on Mathura Road to provide signal-free access to Bharat Mandapam.",
            type: "road",
            status: "completed",
            budget: 7770000000, // ₹777 Cr approx
            impact: "Reduced traffic congestion by 40% on the busy Mathura Road, saving hours of daily travel time.",
            location: { lat: 28.6110, lng: 77.2390, address: "Mathura Road Near Purana Qila, Delhi" },
            authorName: "PWD Delhi",
            areaImpact: "Central Delhi Commuter Corridor",
            messagesGenerated: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("geoFences", {
            name: "Mathura Road Corridor Zone",
            type: "road",
            status: "active",
            center: { lat: 28.6110, lng: 77.2390 },
            radius: 1000,
            linkedProjectId: project3Id,
            triggerCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return "Successfully seeded Bharat Mandapam (Delhi) projects and geofences.";
    },
});
