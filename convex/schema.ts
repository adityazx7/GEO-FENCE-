import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ====== USERS ======
  users: defineTable({
    clerkId: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    passwordHash: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("citizen"), v.literal("operator")),
    userType: v.union(v.literal("citizen"), v.literal("organization")),
    isVerified: v.boolean(),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    age: v.optional(v.number()),
    segment: v.optional(v.string()), // "Commuter", "Parent", "Standard"
    preferredLanguage: v.optional(v.string()), // "en", "hi", "mr", etc.
    motherTongue: v.optional(v.string()),
    pushToken: v.optional(v.string()),
    lastGeofenceCheck: v.optional(v.number()),
    notificationFrequency: v.optional(v.union(v.literal("1d"), v.literal("12h"), v.literal("1h"), v.literal("always"))),
    notificationRadius: v.optional(v.number()),
    notificationTypes: v.optional(v.array(v.string())),
    lastBatchNotificationAt: v.optional(v.number()),
    orgName: v.optional(v.string()),
    orgType: v.optional(v.union(v.literal("ngo"), v.literal("government"), v.literal("private"), v.literal("trust"), v.literal("other"))),
    orgRegistrationNumber: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_clerkId", ["clerkId"]),

  verificationCodes: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
  }).index("by_email", ["email"]),

  // ====== GEO-FENCES ======
  geoFences: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("hospital"), v.literal("bridge"), v.literal("road"), v.literal("school"), v.literal("metro"), v.literal("college"), v.literal("government_office"), v.literal("other")),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("pending")),
    center: v.object({ lat: v.number(), lng: v.number() }),
    radius: v.number(),
    polygon: v.optional(v.array(v.object({ lat: v.number(), lng: v.number() }))),
    linkedProjectId: v.optional(v.id("projects")),
    triggerCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"]),

  // ====== PROJECTS ======
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    type: v.union(v.literal("hospital"), v.literal("bridge"), v.literal("road"), v.literal("school"), v.literal("metro"), v.literal("college"), v.literal("government_office"), v.literal("other")),
    status: v.union(v.literal("completed"), v.literal("in_progress"), v.literal("planned"), v.literal("delayed")),
    budget: v.number(),
    completionDate: v.optional(v.string()),
    impact: v.string(),
    location: v.object({ lat: v.number(), lng: v.number(), address: v.string() }),
    authorName: v.optional(v.string()),
    authorId: v.optional(v.id("users")),
    likes: v.optional(v.number()),
    dislikes: v.optional(v.number()),
    beforeImages: v.optional(v.array(v.string())),
    afterImages: v.optional(v.array(v.string())),
    progress: v.optional(v.number()),
    // AI MESSAGE MATRIX (from CivicPulse)
    aiMessages: v.optional(v.any()), // { Standard: { Morning: { en, hi }, ... }, Commuter: {...}, Parent: {...} }
    messagesGenerated: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_authorId", ["authorId"]),

  // ====== NOTIFICATIONS ======
  notifications: defineTable({
    userId: v.optional(v.string()),
    geoFenceId: v.optional(v.id("geoFences")),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    content: v.string(),
    type: v.union(v.literal("governance_update"), v.literal("project_milestone"), v.literal("proximity_alert"), v.literal("system")),
    status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read")),
    language: v.optional(v.string()),
    blockchainTxHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // ====== GEOFENCE ENTRIES (tracking who entered what zone) ======
  geofenceEntries: defineTable({
    userId: v.string(),
    geoFenceId: v.id("geoFences"),
    geoFenceName: v.string(),
    geoFenceType: v.string(),
    projectId: v.optional(v.id("projects")),
    projectName: v.optional(v.string()),
    enteredAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_time", ["userId", "enteredAt"])
    .index("by_user_project", ["userId", "projectId"]),

  // ====== ACCOUNTABILITY RECORDS (from CivicSentinel) ======
  accountabilityRecords: defineTable({
    zoneId: v.string(),
    zoneName: v.string(),
    officialName: v.string(),
    officialPost: v.string(), // MLA, Commissioner, Engineer, Nagarsevak
    partyName: v.string(),
    projectClaim: v.string(),
    startDate: v.string(),
    claimedCompletionDate: v.string(),
    actualStatus: v.string(),
    dataHash: v.string(), // SHA-256 of all fields
    txHash: v.optional(v.string()), // Polygon txHash
    explorerUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_zoneId", ["zoneId"])
    .index("by_officialName", ["officialName"]),

  // ====== ISSUES (citizen reports) ======
  issues: defineTable({
    userId: v.string(),
    projectId: v.optional(v.id("projects")),
    location: v.object({ lat: v.number(), lng: v.number(), address: v.optional(v.string()) }),
    images: v.optional(v.array(v.string())),
    description: v.string(),
    category: v.union(v.literal("road_damage"), v.literal("water_leak"), v.literal("street_light"), v.literal("garbage"), v.literal("construction_delay"), v.literal("other")),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("rejected")),
    upvotes: v.optional(v.array(v.string())),
    // AI triage from CivicPulse
    aiCategory: v.optional(v.string()),
    aiSeverity: v.optional(v.number()), // 1-10
    aiDescription: v.optional(v.string()),
    isSpam: v.optional(v.boolean()),
    polygonTxHash: v.optional(v.string()), // on-chain notarization
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_projectId", ["projectId"]),

  // ====== INTERACTIONS ======
  interactions: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    type: v.union(v.literal("like"), v.literal("dislike"), v.literal("read")),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user_project", ["userId", "projectId"]),

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

  // ====== ANALYTICS ======
  analyticsEvents: defineTable({
    eventType: v.union(v.literal("geofence_enter"), v.literal("geofence_exit"), v.literal("notification_sent"), v.literal("notification_read"), v.literal("dashboard_view")),
    geoFenceId: v.optional(v.id("geoFences")),
    userId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_eventType", ["eventType"])
    .index("by_timestamp", ["timestamp"]),

  // ====== AUDIT LOG ======
  auditLog: defineTable({
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    details: v.string(),
    txHash: v.optional(v.string()),
    verified: v.boolean(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),

  // ====== SYNC STATE (OGD pagination) ======
  syncState: defineTable({
    key: v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),

  // ====== TRANSLATION CACHE ======
  translationCache: defineTable({
    originalText: v.string(),
    targetLanguage: v.string(),
    translatedText: v.string(),
    createdAt: v.number(),
  }).index("by_original_text", ["originalText", "targetLanguage"]),
});
