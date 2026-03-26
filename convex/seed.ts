import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const seedTestUser = internalMutation({
    args: {},
    handler: async (ctx) => {
        const email = "org@jansang.ai";
        const password = "password"; // Use a simple password for testing
        
        const existing = await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", email))
            .first();
            
        if (existing) {
            console.log("Test user already exists.");
            return existing._id;
        }
        
        const userId = await ctx.db.insert("users", {
            name: "Test Org Admin",
            email: email,
            passwordHash: password,
            role: "admin",
            userType: "organization",
            isVerified: true,
            state: "Maharashtra",
            city: "Mumbai",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        
        console.log(`Created test user: ${email} with password: ${password}`);
        return userId;
    },
});

export const listUsers = internalMutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        return users.map(u => ({ email: u.email, isVerified: u.isVerified, role: u.role }));
    },
});

export const findUserRaw = internalMutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), args.email)).first();
        return user ? { email: user.email, hasPassword: !!user.passwordHash, isVerified: user.isVerified } : null;
    },
});

export const seedSpecificUser = internalMutation({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args) => {
        const email = args.email.trim().toLowerCase();
        const existing = await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", email))
            .first();
            
        if (existing) {
            await ctx.db.patch(existing._id, { 
                passwordHash: args.password, 
                isVerified: true,
                role: "admin"
            });
            return "Updated existing user with new password and verified status.";
        }
        
        await ctx.db.insert("users", {
            name: "Organization Admin",
            email: email,
            passwordHash: args.password,
            role: "admin",
            userType: "organization",
            isVerified: true,
            state: "Maharashtra",
            city: "Mumbai",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return "Created new verified user with provided credentials.";
    },
});

export const clearTranslationCache = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cached = await ctx.db.query("translationCache").collect();
        for (const item of cached) {
            await ctx.db.delete(item._id);
        }
        return `Cleared ${cached.length} items from cache.`;
    },
});
export const removeDuplicateUsers = internalMutation({
    args: {},
    handler: async (ctx) => {
        const allUsers = await ctx.db.query("users").collect();
        const emailsSeen = new Set<string>();
        const toDelete: any[] = [];
        
        // Sort by creation time descending (keep newest first)
        const sorted = allUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        for (const user of sorted) {
            if (emailsSeen.has(user.email)) {
                // If we've seen this email before, this is a duplicate (and older)
                toDelete.push(user._id);
            } else {
                emailsSeen.add(user.email);
            }
        }
        
        for (const id of toDelete) {
            await ctx.db.delete(id);
        }
        
        return `Removed ${toDelete.length} duplicate user records. Emails preserved: ${emailsSeen.size}`;
    },
});
