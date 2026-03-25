import { mutation } from "./_generated/server";

// ====== SEED ORG USER (for demo login) ======
export const seedOrgUser = mutation({
    args: {},
    handler: async (ctx) => {
        const email = "org@civicsentinel.in";
        const passwordHash = "2618be5da8aefa55ea5834d506110cf6fab41a09236ffaa6798f8a1a83125a9c";

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", email))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, { passwordHash });
            return "Updated existing org user password to: alpha123";
        }

        await ctx.db.insert("users", {
            name: "CivicSentinel HQ", email, passwordHash, role: "operator", userType: "organization",
            isVerified: true, state: "Maharashtra", city: "Mumbai",
            orgName: "CivicSentinel Operations", orgType: "government",
            orgRegistrationNumber: "GOV-MH-2024-001", orgContactPerson: "Admin",
            orgDescription: "Official CivicSentinel governance operations unit",
            createdAt: Date.now(), updatedAt: Date.now(),
        });

        return "Created new org user: org@civicsentinel.in / alpha123";
    },
});

export const seedDatabase = mutation({
    args: {},
    handler: async (ctx) => {
        const existingFences = await ctx.db.query("geoFences").take(1);
        if (existingFences.length > 0) return "Already seeded";

        // ====== SEED BOOTHS (16 Booths total) ======
        const booths = [];
        const boothData = [
            { no: "BT-0012", name: "Tembhipada Ward Office", constituency: "Mumbai South", lat: 19.0176, lng: 72.8562 },
            { no: "BT-0045", name: "Dadar Community Hall", constituency: "Mumbai Central", lat: 19.0178, lng: 72.8478 },
            { no: "BT-0089", name: "Andheri Public School", constituency: "Mumbai North", lat: 19.1197, lng: 72.8464 },
            { no: "BT-0123", name: "Bandra Library Hall", constituency: "Mumbai West", lat: 19.0596, lng: 72.8295 },
            { no: "BT-0201", name: "Worli Seaface School", constituency: "Mumbai South", lat: 19.0118, lng: 72.8154 },
            { no: "BT-0312", name: "Goregaon Housing Colony", constituency: "Mumbai North West", lat: 19.1634, lng: 72.8522 },
            { no: "BT-0405", name: "Vikhroli Station Road", constituency: "Mumbai North East", lat: 19.1118, lng: 72.9288 },
            { no: "BT-0501", name: "Sion Hospital Ground", constituency: "Mumbai South Central", lat: 19.0371, lng: 72.8596 },
            { no: "BT-0601", name: "Dharavi Transit Camp", constituency: "Mumbai South Central", lat: 19.0433, lng: 72.8562 },
            { no: "BT-0714", name: "Sewri Koliwada School", constituency: "Mumbai South", lat: 19.0012, lng: 72.8554 },
            { no: "BT-0822", name: "Borivali Sanjay Gandhi", constituency: "Mumbai North", lat: 19.2288, lng: 72.8541 },
            { no: "BT-0911", name: "Juhu Beach Chowpatty", constituency: "Mumbai West", lat: 19.0988, lng: 72.8264 },
            { no: "BT-1002", name: "Crawford Market Hall", constituency: "Mumbai South", lat: 18.9472, lng: 72.8339 },
            { no: "BT-1120", name: "BKC G-Block Office", constituency: "Mumbai North Central", lat: 19.0601, lng: 72.8644 },
            { no: "BT-1245", name: "Mulund Navghar School", constituency: "Mumbai North East", lat: 19.1764, lng: 72.9522 },
            { no: "BT-1311", name: "Kandivali Thakur Village", constituency: "Mumbai North", lat: 19.2088, lng: 72.8741 },
        ];

        for (const b of boothData) {
            const id = await ctx.db.insert("booths", {
                boothNumber: b.no, name: b.name, constituency: b.constituency,
                location: { lat: b.lat, lng: b.lng }, totalVoters: Math.floor(5000 + Math.random() * 10000),
                activeVoters: Math.floor(2000 + Math.random() * 3000),
                lastUpdated: Date.now(), createdAt: Date.now(),
            });
            booths.push(id);
        }

        // ====== SEED PROJECTS (18 Projects total) ======
        const projData = [
            { name: "Tembhipada Health Center", type: "hospital", status: "completed", budget: 45000000, lat: 19.0176, lng: 72.8562, bid: booths[0] },
            { name: "Mahim-Dadar Flyover", type: "bridge", status: "in_progress", budget: 120000000, lat: 19.0282, lng: 72.8432, bid: booths[1] },
            { name: "Andheri Metro Extension", type: "metro", status: "in_progress", budget: 350000000, lat: 19.1197, lng: 72.8464, bid: booths[2] },
            { name: "Bandra College Renovation", type: "college", status: "planned", budget: 28000000, lat: 19.0596, lng: 72.8295, bid: booths[3] },
            { name: "Mumbai Coastal Road Ph 1", type: "road", status: "in_progress", budget: 1200000000, lat: 19.0118, lng: 72.8154, bid: booths[4] },
            { name: "Goregaon-Mulund Link Road", type: "road", status: "planned", budget: 6300000000, lat: 19.1634, lng: 72.8522, bid: booths[5] },
            { name: "Vikhroli Railway Overbridge", type: "bridge", status: "completed", budget: 52000000, lat: 19.1118, lng: 72.9288, bid: booths[6] },
            { name: "Sion Super-Specialty Block", type: "hospital", status: "in_progress", budget: 180000000, lat: 19.0371, lng: 72.8596, bid: booths[7] },
            { name: "Dharavi Redevelopment Ph 1", type: "road", status: "planned", budget: 23000000000, lat: 19.0433, lng: 72.8562, bid: booths[8] },
            { name: "Sewri-Worli Connector", type: "bridge", status: "in_progress", budget: 1050000000, lat: 19.0012, lng: 72.8554, bid: booths[9] },
            { name: "Borivali-Thane Twin Tunnel", type: "road", status: "planned", budget: 11000000000, lat: 19.2288, lng: 72.8541, bid: booths[10] },
            { name: "Juhu Beach Anti-Erosion", type: "road", status: "in_progress", budget: 85000000, lat: 19.0988, lng: 72.8264, bid: booths[11] },
            { name: "Crawford Market Restore", type: "hospital", status: "in_progress", budget: 145000000, lat: 18.9472, lng: 72.8339, bid: booths[12] },
            { name: "BKC Smart Street Upgrades", type: "road", status: "completed", budget: 32000000, lat: 19.0601, lng: 72.8644, bid: booths[13] },
            { name: "Mulund Navghar Bridge", type: "bridge", status: "planned", budget: 95000000, lat: 19.1764, lng: 72.9522, bid: booths[14] },
            { name: "Kandivali Flyover Repair", type: "bridge", status: "completed", budget: 12000000, lat: 19.2088, lng: 72.8741, bid: booths[15] },
            { name: "MTHL Toll Plaza Hub", type: "road", status: "completed", budget: 450000000, lat: 18.9912, lng: 72.8754, bid: booths[9] },
            { name: "Wadala Terminal Modernization", type: "road", status: "in_progress", budget: 850000000, lat: 19.0212, lng: 72.8754, bid: booths[7] },
        ];

        for (const p of projData) {
            const pid = await ctx.db.insert("projects", {
                name: p.name, description: `${p.name} - Official governance project to improve civic infrastructure in Mumbai.`,
                type: p.type as any, status: p.status as any, budget: p.budget,
                impact: `Significant improvement for ${Math.floor(Math.random() * 500000)} daily residents.`,
                authorName: "CivicSentinel HQ", likes: Math.floor(Math.random() * 1000), dislikes: Math.floor(Math.random() * 50),
                location: { lat: p.lat, lng: p.lng, address: `${p.name} Site, Mumbai` },
                boothId: p.bid, createdAt: Date.now(), updatedAt: Date.now(),
            });

            // Corresponding Geo-Fence
            await ctx.db.insert("geoFences", {
                name: `${p.name} Alert Zone`, description: `Proximity monitoring for ${p.name}`,
                type: p.type as any, status: 'active',
                center: { lat: p.lat, lng: p.lng }, radius: 600 + Math.random() * 400, linkedProjectId: pid,
                triggerCount: Math.floor(Math.random() * 5000), createdAt: Date.now(), updatedAt: Date.now(),
            });
        }

        // ====== SEED NOTIFICATIONS & ANALYTICS ======
        const today = Date.now();
        await ctx.db.insert("notifications", {
            title: "🏗️ Major Milestone: Coastal Road",
            content: "Coastal Road Tunnel testing now live near Worli Seaface!",
            type: "project_milestone", status: "delivered", language: "en", createdAt: today - 86400000,
        });

        const eventTypes = ["geofence_enter", "notification_sent", "notification_read", "dashboard_view"] as const;
        for (let i = 0; i < 60; i++) {
            await ctx.db.insert("analyticsEvents", {
                eventType: eventTypes[i % eventTypes.length], timestamp: today - Math.random() * 604800000,
            });
        }

        return "Database Seeding Complete with 18+ Mumbai Projects and 16 Booths!";
    },
});

export const clearDatabase = mutation({
    args: {},
    handler: async (ctx) => {
        const tables = ["projects", "geoFences", "notifications", "booths", "auditLog", "analyticsEvents", "interactions", "comments"];
        let totalDeleted = 0;
        for (const table of tables) {
            const docs = await ctx.db.query(table as any).collect();
            for (const doc of docs) { await ctx.db.delete(doc._id); totalDeleted++; }
        }
        return `Cleared ${totalDeleted} documents.`;
    },
});
