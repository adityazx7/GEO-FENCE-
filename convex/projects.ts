import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        projectId: v.id("projects"),
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
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db.query("comments")
            .withIndex("by_project", q => q.eq("projectId", args.projectId))
            .order("desc")
            .collect();
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
