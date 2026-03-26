import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ====== USERS ======
    users: defineTable({
        clerkId: v.optional(v.string()), // Optional: only set for web dashboard users via Clerk
        name: v.string(),
        email: v.string(),
        passwordHash: v.optional(v.string()), // For mobile app direct auth
        role: v.union(v.literal("admin"), v.literal("citizen"), v.literal("operator")),
        userType: v.union(v.literal("citizen"), v.literal("organization")),
        avatar: v.optional(v.string()),
        isVerified: v.boolean(), // Email verification status

        // Location
        location: v.optional(v.object({
            lat: v.number(),
            lng: v.number(),
        })),
        state: v.optional(v.string()),   // Indian state
        city: v.optional(v.string()),    // City in that state

        // Citizen-specific fields
        age: v.optional(v.number()),
        aadhaar: v.optional(v.string()), // Optional Aadhaar number

        // Organization-specific fields
        orgName: v.optional(v.string()),
        orgType: v.optional(v.union(
            v.literal("ngo"), v.literal("government"),
            v.literal("private"), v.literal("trust"), v.literal("other")
        )),
        orgRegistrationNumber: v.optional(v.string()),
        orgContactPerson: v.optional(v.string()),
        orgWebsite: v.optional(v.string()),
        orgDescription: v.optional(v.string()),

        segment: v.optional(v.string()),
        preferredLanguage: v.optional(v.string()),
        motherTongue: v.optional(v.string()),
        pushToken: v.optional(v.string()), // Expo push notification token
        lastGeofenceCheck: v.optional(v.number()), // Timestamp for throttling
        
        // ===== Custom Notification Preferences =====
        notificationFrequency: v.optional(v.union(v.literal("1d"), v.literal("12h"), v.literal("1h"), v.literal("always"))),
        notificationRadius: v.optional(v.number()), // custom radius in meters (100, 300, 500)
        notificationTypes: v.optional(v.array(v.string())), // e.g. ["planned", "in_progress", "completed"]
        lastBatchNotificationAt: v.optional(v.number()), // timestamp of last summary notification push

        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_clerkId", ["clerkId"])
        .index("by_email", ["email"]),

    // ====== EMAIL VERIFICATION CODES ======
    verificationCodes: defineTable({
        email: v.string(),
        code: v.string(),     // 6-digit OTP
        expiresAt: v.number(), // Timestamp
        used: v.boolean(),
    })
        .index("by_email", ["email"]),

    // ====== GEO-FENCES ======
    geoFences: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        type: v.union(
            v.literal("hospital"),
            v.literal("bridge"),
            v.literal("road"),
            v.literal("school"),
            v.literal("metro"),
            v.literal("college"),
            v.literal("government_office"),
            v.literal("other")
        ),
        status: v.union(v.literal("active"), v.literal("inactive"), v.literal("pending")),
        center: v.object({
            lat: v.number(),
            lng: v.number(),
        }),
        radius: v.number(), // meters
        polygon: v.optional(v.array(v.object({
            lat: v.number(),
            lng: v.number(),
        }))),
        linkedProjectId: v.optional(v.id("projects")),
        triggerCount: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_type", ["type"]),

    // ====== INFRASTRUCTURE PROJECTS ======
    projects: defineTable({
        name: v.string(),
        description: v.string(),
        type: v.union(
            v.literal("hospital"),
            v.literal("bridge"),
            v.literal("road"),
            v.literal("school"),
            v.literal("metro"),
            v.literal("college"),
            v.literal("government_office"),
            v.literal("other")
        ),
        status: v.union(
            v.literal("completed"),
            v.literal("in_progress"),
            v.literal("planned"),
            v.literal("delayed")
        ),
        budget: v.number(), // in INR
        completionDate: v.optional(v.string()),
        impact: v.string(), // e.g. "Reduces commute by 15 minutes"
        areaImpact: v.optional(v.string()), // How it helps the area
        location: v.object({
            lat: v.number(),
            lng: v.number(),
            address: v.string(),
        }),
        authorName: v.optional(v.string()), // Name of org or user
        authorId: v.optional(v.id("users")), // Link to user record
        submittedBy: v.optional(v.string()), // Legacy email field
        likes: v.optional(v.number()),
        dislikes: v.optional(v.number()),
        beforeImages: v.optional(v.array(v.string())), // base64 or URLs
        afterImages: v.optional(v.array(v.string())),  // base64 or URLs
        boothId: v.optional(v.id("booths")),
        progress: v.optional(v.number()), // 0-100 percentage
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_type", ["type"])
        .index("by_authorId", ["authorId"]),

    // ====== NOTIFICATIONS ======
    notifications: defineTable({
        userId: v.optional(v.string()), // clerkId
        geoFenceId: v.optional(v.id("geoFences")),
        projectId: v.optional(v.id("projects")),
        title: v.string(),
        content: v.string(),
        type: v.union(
            v.literal("governance_update"),
            v.literal("project_milestone"),
            v.literal("proximity_alert"),
            v.literal("system")
        ),
        status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read")),
        language: v.optional(v.string()),
        blockchainTxHash: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_status", ["status"])
        .index("by_type", ["type"]),

    // ====== BOOTHS ======
    booths: defineTable({
        boothNumber: v.string(),
        name: v.string(),
        constituency: v.string(),
        location: v.object({
            lat: v.number(),
            lng: v.number(),
        }),
        totalVoters: v.number(),
        activeVoters: v.number(),
        linkedProjects: v.optional(v.array(v.id("projects"))),
        lastUpdated: v.number(),
        createdAt: v.number(),
    })
        .index("by_constituency", ["constituency"])
        .index("by_boothNumber", ["boothNumber"]),

    // ====== PROJECT INTERACTIONS (LIKES/DISLIKES/READS) ======
    interactions: defineTable({
        projectId: v.id("projects"),
        userId: v.string(), // email or clerkId
        type: v.union(v.literal("like"), v.literal("dislike"), v.literal("read")),
        createdAt: v.number(),
    })
        .index("by_project", ["projectId"])
        .index("by_user_project", ["userId", "projectId"])
        .index("by_user_type", ["userId", "type"]),

    // ====== COMMENTS ======
    comments: defineTable({
        projectId: v.optional(v.id("projects")),
        issueId: v.optional(v.id("issues")),
        userId: v.string(),
        authorName: v.string(),
        text: v.string(),
        createdAt: v.number(),
    })
        .index("by_project", ["projectId"])
        .index("by_issue", ["issueId"]),

    // ====== ANALYTICS EVENTS ======
    analyticsEvents: defineTable({
        eventType: v.union(
            v.literal("geofence_enter"),
            v.literal("geofence_exit"),
            v.literal("notification_sent"),
            v.literal("notification_read"),
            v.literal("dashboard_view")
        ),
        geoFenceId: v.optional(v.id("geoFences")),
        userId: v.optional(v.string()),
        metadata: v.optional(v.string()), // JSON string for flexible data
        timestamp: v.number(),
    })
        .index("by_eventType", ["eventType"])
        .index("by_timestamp", ["timestamp"]),

    // ====== GEOFENCE ENTRIES ======
    geofenceEntries: defineTable({
        userId: v.string(),           // user email or _id
        geoFenceId: v.id("geoFences"),
        geoFenceName: v.string(),
        geoFenceType: v.string(),
        projectId: v.optional(v.id("projects")),
        projectName: v.optional(v.string()),
        enteredAt: v.number(),        // timestamp ms
    })
        .index("by_userId", ["userId"])
        .index("by_userId_time", ["userId", "enteredAt"])
        .index("by_user_project", ["userId", "projectId"]),

    // ====== BLOCKCHAIN AUDIT LOG ======
    auditLog: defineTable({
        action: v.string(),
        entityType: v.string(),
        entityId: v.string(),
        details: v.string(),
        txHash: v.optional(v.string()),
        verified: v.boolean(),
        timestamp: v.number(),
    })
        .index("by_timestamp", ["timestamp"])
        .index("by_entityType", ["entityType"]),

    // ====== REPORTED ISSUES ======
    issues: defineTable({
        userId: v.string(), // ID of the citizen reporting
        location: v.object({
            lat: v.number(),
            lng: v.number(),
            address: v.optional(v.string()),
        }),
        images: v.optional(v.array(v.string())), // Array of storage IDs or URLs
        upvotes: v.optional(v.array(v.string())), // Array of user IDs or emails
        downvotes: v.optional(v.array(v.string())), // Array of user IDs or emails
        description: v.string(),
        category: v.union(
            v.literal("road_damage"),
            v.literal("water_leak"),
            v.literal("street_light"),
            v.literal("garbage"),
            v.literal("other")
        ),
        status: v.union(
            v.literal("open"),
            v.literal("in-progress"),
            v.literal("resolved"),
            v.literal("rejected")
        ),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_category", ["category"])
        .index("by_userId", ["userId"]),

    // ====== TRANSLATION CACHE ======
    translationCache: defineTable({
        originalText: v.string(),
        targetLanguage: v.string(),
        translatedText: v.string(),
        createdAt: v.number(),
    })
        .index("by_original_text", ["originalText", "targetLanguage"]),
});
