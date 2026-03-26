import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const register = action({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        userType: v.string(),
        state: v.string(),
        city: v.optional(v.string()),
        age: v.optional(v.number()),
        aadhaar: v.optional(v.string()),
        orgName: v.optional(v.string()),
        orgType: v.optional(v.string()),
        orgRegistrationNumber: v.optional(v.string()),
        orgContactPerson: v.optional(v.string()),
        orgWebsite: v.optional(v.string()),
        orgDescription: v.optional(v.string()),
        motherTongue: v.optional(v.string()),
        preferredLanguage: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<Id<"users">> => {
        const { password, ...rest } = args;
        
        // Check if user already exists
        const existing = await ctx.runQuery(internal.auth_internal.getUserByEmail, { email: args.email });
        if (existing) throw new Error("A user with this email already exists.");

        // In a real app, hash password here. For demo, we just store it.
        const userId: Id<"users"> = await ctx.runMutation(internal.auth_internal.createUser, {
            ...rest,
            passwordHash: password, 
        });
        
        // Generate OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await ctx.runMutation(internal.auth_internal.saveVerificationCode, {
            email: args.email,
            code,
        });

        console.log(`Verification code for ${args.email}: ${code}`);
        return userId;
    },
});

export const login = action({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args): Promise<Doc<"users">> => {
        const email = args.email.trim().toLowerCase();
        console.log(`Attempting login for: ${email}`);
        
        const user = await ctx.runQuery(internal.auth_internal.getUserByEmail, { email });
        if (!user) {
            console.error(`User not found: ${email}`);
            throw new Error("Invalid email or password.");
        }
        
        // In real app, check hash. 
        if (user.passwordHash !== args.password) {
            console.error(`Password mismatch for: ${email}`);
            throw new Error("Invalid email or password.");
        }
        
        if (!user.isVerified) {
            console.error(`User not verified: ${email}`);
            throw new Error("EMAIL_NOT_VERIFIED");
        }
        
        console.log(`Login successful for: ${email}`);
        return user;
    },
});

export const resendCode = action({
    args: { email: v.string() },
    handler: async (ctx, args): Promise<void> => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await ctx.runMutation(internal.auth_internal.saveVerificationCode, {
            email: args.email,
            code,
        });
        console.log(`Resent verification code for ${args.email}: ${code}`);
    },
});
