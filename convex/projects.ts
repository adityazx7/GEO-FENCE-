import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        type: v.union(
            v.literal("hospital"), v.literal("bridge"), v.literal("road"),
            v.literal("school"), v.literal("metro"), v.literal("college"),
            v.literal("government_office"), v.literal("other")
        ),
        status: v.union(
            v.literal("completed"), v.literal("in_progress"),
            v.literal("planned"), v.literal("delayed")
        ),
        budget: v.number(),
        completionDate: v.optional(v.string()),
        impact: v.string(),
        location: v.object({
            lat: v.number(),
            lng: v.number(),
            address: v.string(),
        }),
        authorName: v.optional(v.string()),
        authorId: v.optional(v.id("users")),
        likes: v.optional(v.number()),
        dislikes: v.optional(v.number()),
        boothId: v.optional(v.id("booths")),
        progress: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const projectId = await ctx.db.insert("projects", {
            ...args,
            likes: args.likes ?? 0,
            dislikes: args.dislikes ?? 0,
            messagesGenerated: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        
        await ctx.scheduler.runAfter(0, internal.aiMessages.generateForProject, {
            projectId,
            projectName: args.name,
            projectType: args.type,
            projectStatus: args.status,
            projectImpact: args.impact,
            projectDescription: args.description 
        });
        
        return projectId;
    },
});

export const listActiveForGeo = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("projects").filter(q => q.neq(q.field("status"), "delayed")).collect();
    }
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        const projects = await ctx.db.query("projects").collect();
        
        const mapImages = async (imgs: string[]) => {
            return await Promise.all(
                imgs.map(async (img) => {
                    if (img.startsWith("http")) return img;
                    return await ctx.storage.getUrl(img) || img;
                })
            );
        };

        return await Promise.all(
            projects.map(async (p) => {
                return {
                    ...p,
                    likes: p.likes ?? 0,
                    dislikes: p.dislikes ?? 0,
                    authorName: p.authorName || 'Govt Department',
                    beforeImages: p.beforeImages ? await mapImages(p.beforeImages) : undefined,
                    afterImages: p.afterImages ? await mapImages(p.afterImages) : undefined,
                };
            })
        );
    },
});

export const getById = query({
    args: { id: v.id("projects") },
    handler: async (ctx, args) => {
        const p = await ctx.db.get(args.id);
        if (!p) return null;

        const mapImages = async (imgs: string[]) => {
            return await Promise.all(
                imgs.map(async (img) => {
                    if (img.startsWith("http")) return img;
                    return await ctx.storage.getUrl(img) || img;
                })
            );
        };

        return {
            ...p,
            likes: p.likes ?? 0,
            dislikes: p.dislikes ?? 0,
            authorName: p.authorName || 'Govt Department',
            beforeImages: p.beforeImages ? await mapImages(p.beforeImages) : undefined,
            afterImages: p.afterImages ? await mapImages(p.afterImages) : undefined,
        };
    },
});

export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const all = await ctx.db.query("projects").collect();
        const completed = all.filter((p) => p.status === "completed").length;
        const inProgress = all.filter((p) => p.status === "in_progress").length;
        const planned = all.filter((p) => p.status === "planned").length;
        const totalBudget = all.reduce((sum, p) => sum + p.budget, 0);
        return { total: all.length, completed, inProgress, planned, totalBudget };
    },
});

export const createWork = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        type: v.union(
            v.literal("hospital"), v.literal("bridge"), v.literal("road"),
            v.literal("school"), v.literal("metro"), v.literal("college"),
            v.literal("government_office"), v.literal("other")
        ),
        status: v.union(
            v.literal("completed"), v.literal("in_progress"),
            v.literal("planned"), v.literal("delayed")
        ),
        budget: v.number(),
        impact: v.string(),
        areaImpact: v.optional(v.string()),
        location: v.object({
            lat: v.number(),
            lng: v.number(),
            address: v.string(),
        }),
        authorName: v.optional(v.string()),
        authorId: v.optional(v.id("users")),
        likes: v.optional(v.number()),
        dislikes: v.optional(v.number()),
        beforeImages: v.optional(v.array(v.string())),
        afterImages: v.optional(v.array(v.string())),
        progress: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("projects", {
            ...args,
            likes: args.likes ?? 0,
            dislikes: args.dislikes ?? 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const updateWork = mutation({
    args: {
        id: v.id("projects"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        type: v.optional(v.union(
            v.literal("hospital"), v.literal("bridge"), v.literal("road"),
            v.literal("school"), v.literal("metro"), v.literal("college"),
            v.literal("government_office"), v.literal("other")
        )),
        status: v.optional(v.union(
            v.literal("completed"), v.literal("in_progress"),
            v.literal("planned"), v.literal("delayed")
        )),
        budget: v.optional(v.number()),
        impact: v.optional(v.string()),
        areaImpact: v.optional(v.string()),
        location: v.optional(v.object({
            lat: v.number(),
            lng: v.number(),
            address: v.string(),
        })),
        progress: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        return await ctx.db.patch(id, {
            ...rest,
            updatedAt: Date.now(),
        });
    },
});

export const deleteWork = mutation({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        try {
            // Log the incoming request
            console.log("Attempting to delete project:", args.id);
            
            // Normalize ID
            const projectId = args.id as any;
            
            // Explicitly check if the document exists before attempting deletion
            const project = await ctx.db.get(projectId);
            
            if (!project) {
                console.warn(`Delete failed: Project ${args.id} not found in database.`);
                return { success: false, error: "Project not found or already deleted." };
            }

            console.log("Project found, proceeding with deletion...");

            // Delete the main project document
            await ctx.db.delete(projectId);
            console.log(`Successfully deleted project ${args.id}`);
            
            // Clean up related interactions
            try {
                const interactions = await ctx.db.query("interactions")
                    .withIndex("by_project", q => q.eq("projectId", projectId))
                    .collect();
                
                for (const inter of interactions) {
                    await ctx.db.delete(inter._id);
                }
                console.log(`Cleaned up ${interactions.length} interactions.`);
            } catch (err) {
                 console.error("Failed to clean up interactions:", err);
                 // Non-fatal, continue with deletion process
            }

            // Clean up related comments
            try {
                const comments = await ctx.db.query("comments")
                    .withIndex("by_project", q => q.eq("projectId", projectId))
                    .collect();
                    
                for (const comment of comments) {
                    await ctx.db.delete(comment._id);
                }
                console.log(`Cleaned up ${comments.length} comments.`);
            } catch (err) {
                 console.error("Failed to clean up comments:", err);
                 // Non-fatal
            }

            return { success: true };
            
        } catch (error: any) {
            console.error("Critical error in deleteWork mutation:", error);
            return { 
                success: false, 
                error: error?.message || "An unexpected database error occurred during deletion." 
            };
        }
    },
});

export const toggleInteraction = mutation({
    args: {
        projectId: v.id("projects"),
        userId: v.string(),
        type: v.union(v.literal("like"), v.literal("dislike")),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("interactions")
            .withIndex("by_user_project", q => q.eq("userId", args.userId).eq("projectId", args.projectId))
            .unique();

        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        if (existing) {
            // Remove existing interaction
            await ctx.db.delete(existing._id);
            if (existing.type === "like") {
                await ctx.db.patch(args.projectId, { likes: Math.max(0, (project.likes ?? 0) - 1) });
            } else {
                await ctx.db.patch(args.projectId, { dislikes: Math.max(0, (project.dislikes ?? 0) - 1) });
            }

            // If toggling to a DIFFERENT type
            if (existing.type !== args.type) {
                await ctx.db.insert("interactions", { ...args, createdAt: Date.now() });
                if (args.type === "like") {
                    await ctx.db.patch(args.projectId, { likes: (project.likes ?? 0) + 1 });
                } else {
                    await ctx.db.patch(args.projectId, { dislikes: (project.dislikes ?? 0) + 1 });
                }
            }
        } else {
            // New interaction
            await ctx.db.insert("interactions", { ...args, createdAt: Date.now() });
            if (args.type === "like") {
                await ctx.db.patch(args.projectId, { likes: (project.likes ?? 0) + 1 });
            } else {
                await ctx.db.patch(args.projectId, { dislikes: (project.dislikes ?? 0) + 1 });
            }
        }
    },
});

export const addComment = mutation({
    args: {
        projectId: v.optional(v.id("projects")),
        issueId: v.optional(v.id("issues")),
        userId: v.string(),
        authorName: v.string(),
        text: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("comments", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

export const getComments = query({
    args: { 
        projectId: v.optional(v.id("projects")),
        issueId: v.optional(v.id("issues"))
    },
    handler: async (ctx, args) => {
        if (args.projectId) {
            return await ctx.db.query("comments")
                .withIndex("by_project", q => q.eq("projectId", args.projectId))
                .order("desc")
                .collect();
        }
        if (args.issueId) {
            return await ctx.db.query("comments")
                .withIndex("by_issue", q => q.eq("issueId", args.issueId))
                .order("desc")
                .collect();
        }
        return [];
    },
});

export const getInteractions = query({
    args: { projectId: v.id("projects"), userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.query("interactions")
            .withIndex("by_user_project", q => q.eq("userId", args.userId).eq("projectId", args.projectId))
            .unique();
    },
});

export const markRead = mutation({
    args: { projectId: v.id("projects"), userId: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("interactions")
            .withIndex("by_user_project", q => q.eq("userId", args.userId).eq("projectId", args.projectId))
            .filter(q => q.eq(q.field("type"), "read"))
            .unique();

        if (!existing) {
            await ctx.db.insert("interactions", {
                projectId: args.projectId,
                userId: args.userId,
                type: "read",
                createdAt: Date.now(),
            });

            // Also mark related notifications as read for this user
            const relatedNotifications = await ctx.db.query("notifications")
                .withIndex("by_userId", q => q.eq("userId", args.userId))
                .filter(q => q.eq(q.field("projectId"), args.projectId))
                .collect();
            
            for (const notification of relatedNotifications) {
                if (notification.status !== "read") {
                    await ctx.db.patch(notification._id, { status: "read" });
                }
            }
        }
    },
});

export const getReadProjects = query({
    args: { userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        try {
            const userId = args.userId;
            if (!userId) return [];
            
            // Just get all for this user and filter in JS to be safe
            const allInteractions = await ctx.db.query("interactions")
                .collect();
                
            return allInteractions
                .filter(i => i.userId === userId && i.type === "read")
                .map(i => i.projectId);
        } catch (e) {
            console.error("Error in getReadProjects:", e);
            return [];
        }
    },
});

// ===== GEOFENCE ENTRY LOGGING =====
export const logGeofenceEntry = mutation({
    args: {
        userId: v.string(),
        geoFenceId: v.id("geoFences"),
        geoFenceName: v.string(),
        geoFenceType: v.string(),
        projectId: v.optional(v.id("projects")),
        projectName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        
        // 1. Strict Deduplication: If this user has EVER entered this project, don't log it again.
        // This fulfills the "must only get marked once only" requirement.
        if (args.projectId) {
            const existing = await ctx.db.query("geofenceEntries")
                .withIndex("by_user_project", q => q.eq("userId", args.userId).eq("projectId", args.projectId))
                .first();
            
            if (existing) {
                console.log(`Updating existing geofence entry for project ${args.projectId}`);
                await ctx.db.patch(existing._id, {
                    geoFenceName: args.geoFenceName,
                    geoFenceType: args.geoFenceType,
                    projectName: args.projectName,
                });
                return existing._id;
            }
        } else {
            // Fallback for non-project geofences (if any): use the 5-minute rule
            const recent = await ctx.db.query("geofenceEntries")
                .withIndex("by_userId", q => q.eq("userId", args.userId))
                .collect();
            const alreadyLogged = recent.find(e =>
                e.geoFenceId === args.geoFenceId &&
                (now - e.enteredAt) < 5 * 60 * 1000
            );
            if (alreadyLogged) return alreadyLogged._id;
        }

        return await ctx.db.insert("geofenceEntries", {
            userId: args.userId,
            geoFenceId: args.geoFenceId,
            geoFenceName: args.geoFenceName,
            geoFenceType: args.geoFenceType,
            projectId: args.projectId,
            projectName: args.projectName,
            enteredAt: now,
        });
    },
});

export const getRecentGeofenceEntries = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        if (!args.userId) return [];
        
        let user: any = null;
        // 1. Precise ID try
        try { user = await ctx.db.get(args.userId as any); } catch(e) {}
        
        // 2. Email try
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_email", q => q.eq("email", args.userId))
                .first();
        }
        // 3. Clerk ID try
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_clerkId", q => q.eq("clerkId", args.userId))
                .unique();
        }

        const lastBatchAt = user?.lastBatchNotificationAt || 0;
        const identifiers = [args.userId];
        if (user) {
            identifiers.push(user._id);
            identifiers.push(user.email);
            identifiers.push(user.clerkId);
        }
        const uniqueIds = Array.from(new Set(identifiers.filter(Boolean)));

        // Combine entries from all possible IDs
        let allEntries: any[] = [];
        for (const id of uniqueIds) {
            const entries = await ctx.db.query("geofenceEntries")
                .withIndex("by_userId", q => q.eq("userId", id!))
                .collect();
            allEntries = [...allEntries, ...entries];
        }
            
        // Filter and Deduplicate
        const seen = new Set();
        return allEntries
            .filter(e => {
                if (e.enteredAt < lastBatchAt) return false;
                const key = `${e.geoFenceId}-${e.enteredAt}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => b.enteredAt - a.enteredAt);
    },
});

export const clearRecentGeofences = mutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        let user: any = null;
        // 1. Precise ID try
        try { user = await ctx.db.get(args.userId as any); } catch(e) {}
        
        // 2. Email try
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_email", q => q.eq("email", args.userId))
                .first();
        }
        // 3. Clerk ID try
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_clerkId", q => q.eq("clerkId", args.userId))
                .unique();
        }

        const identifiers = [args.userId];
        if (user) {
            identifiers.push(user._id);
            identifiers.push(user.email);
            identifiers.push(user.clerkId);
        }

        const uniqueIds = Array.from(new Set(identifiers.filter(Boolean)));
        console.log(`[ClearRecent] Attempting to clear entries for identifiers:`, uniqueIds);

        let totalDeleted = 0;
        for (const id of uniqueIds) {
            const entries = await ctx.db.query("geofenceEntries")
                .withIndex("by_userId", q => q.eq("userId", id!))
                .collect();
            
            for (const entry of entries) {
                await ctx.db.delete(entry._id);
                totalDeleted++;
            }
        }

        // FAIL-SAFE: Also update the user's batch timer so they disappear from view immediately
        if (user) {
            await ctx.db.patch(user._id, {
                lastBatchNotificationAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        console.log(`[ClearRecent] Successfully deleted ${totalDeleted} entries and updated timer.`);
        return { success: true, count: totalDeleted };
    },
});

// Save/update user push token
export const savePushToken = mutation({
    args: { userId: v.id("users"), token: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { pushToken: args.token });
    },
});
