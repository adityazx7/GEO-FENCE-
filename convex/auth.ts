import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ====== HELPERS ======

/**
 * Hash a password using SHA-256 (Web Crypto API)
 * This works in both Node and standard JS runtimes.
 */
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generate6DigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ====== REGISTER ======
export const register = action({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        userType: v.union(v.literal("citizen"), v.literal("organization")),
        state: v.string(),
        city: v.optional(v.string()),
        age: v.optional(v.number()),
        aadhaar: v.optional(v.string()),
        orgName: v.optional(v.string()),
        orgType: v.optional(v.union(
            v.literal("ngo"), v.literal("government"),
            v.literal("private"), v.literal("trust"), v.literal("other")
        )),
        orgRegistrationNumber: v.optional(v.string()),
        orgContactPerson: v.optional(v.string()),
        orgWebsite: v.optional(v.string()),
        orgDescription: v.optional(v.string()),
        preferredLanguage: v.optional(v.string()),
        motherTongue: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<any> => {
        // Check if email already registered
        const existing = await ctx.runQuery(internal.authHelpers.getUserByEmail, { email: args.email });
        if (existing) {
            throw new Error("An account with this email already exists.");
        }

        const passwordHash = await hashPassword(args.password);
        const code = generate6DigitCode();

        // Create user and verification code in one atomic mutation
        const userId = await ctx.runMutation(internal.authHelpers.completeRegistration, {
            userData: {
                name: args.name,
                email: args.email.trim().toLowerCase(),
                passwordHash,
                userType: args.userType,
                role: args.userType === "citizen" ? "citizen" : "operator",
                state: args.state,
                city: args.city,
                age: args.age,
                aadhaar: args.aadhaar,
                orgName: args.orgName,
                orgType: args.orgType,
                orgRegistrationNumber: args.orgRegistrationNumber,
                orgContactPerson: args.orgContactPerson,
                orgWebsite: args.orgWebsite,
                orgDescription: args.orgDescription,
                preferredLanguage: args.preferredLanguage,
                motherTongue: args.motherTongue,
            },
            verificationCode: code,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });

        console.log(`\n========================================`);
        console.log(`📧 VERIFICATION CODE for ${args.email}: ${code}`);
        console.log(`========================================\n`);

        return { userId, email: args.email };
    },
});

// ====== LOGIN ======
export const login = action({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args): Promise<any> => {
        let user = await ctx.runQuery(internal.authHelpers.getUserByEmail, { email: args.email });
        
        // FAIL-SAFE: If this is the demo org email and it's missing, seed it now
        if (!user && args.email === "org@civicsentinel.in") {
            console.log("Seeding missing demo user...");
            const demoHash = "2618be5da8aefa55ea5834d506110cf6fab41a09236ffaa6798f8a1a83125a9c"; // alpha123
            await ctx.runMutation(internal.authHelpers.seedUser, {
                name: "CivicSentinel HQ",
                email: args.email,
                passwordHash: demoHash,
                role: "operator",
                userType: "organization",
                state: "Maharashtra",
                city: "Mumbai",
            });
            user = await ctx.runQuery(internal.authHelpers.getUserByEmail, { email: args.email });
            user = await ctx.runQuery(internal.authHelpers.getUserByEmail, { email: args.email });
        }

        if (!user) {
            throw new Error("No account found with this email.");
        }

        const passwordHash = await hashPassword(args.password);
        if (user.passwordHash !== passwordHash) {
            throw new Error("Incorrect password.");
        }

        if (!user.isVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            userType: user.userType,
            role: user.role,
            state: user.state,
            city: user.city,
            age: user.age,
            avatar: user.avatar,
            orgName: user.orgName,
            orgType: user.orgType,
            preferredLanguage: user.preferredLanguage,
            motherTongue: user.motherTongue,
        };
    },
});

// ====== RESEND CODE ======
export const resendCode = action({
    args: { email: v.string() },
    handler: async (ctx, args): Promise<any> => {
        const user = await ctx.runQuery(internal.authHelpers.getUserByEmail, { email: args.email });
        if (!user) throw new Error("No account found.");
        if (user.isVerified) throw new Error("Account is already verified.");

        const code = generate6DigitCode();
        await ctx.runMutation(internal.authHelpers.insertVerificationCode, {
            email: args.email,
            code,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });

        console.log(`\n========================================`);
        console.log(`📧 NEW VERIFICATION CODE for ${args.email}: ${code}`);
        console.log(`========================================\n`);

        return { success: true };
    },
});
