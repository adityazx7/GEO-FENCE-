"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import bcrypt from 'bcryptjs';

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

        // Hash password securely via bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const userId: Id<"users"> = await ctx.runMutation(internal.auth_internal.createUser, {
            ...rest,
            passwordHash, 
        });
        
        // Generate OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await ctx.runMutation(internal.auth_internal.saveVerificationCode, {
            email: args.email,
            code,
        });

        // 3. Send Email via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.warn("⚠️ RESEND_API_KEY is NOT set in Convex Environment Variables. Skipping email send.");
        } else {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'JanSang AI <onboarding@resend.dev>',
                        to: [args.email],
                        subject: 'Verify your JanSang AI Account',
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h1 style="color: #00D4FF;">JanSang AI</h1>
                                <p>Welcome to the hyper-local transparency engine.</p>
                                <p>Your verification code is:</p>
                                <div style="font-size: 32px; font-weight: bold; background: #f4f4f4; padding: 15px; text-align: center; border-radius: 8px;">
                                    ${code}
                                </div>
                                <p style="color: #666; margin-top: 20px;">This code will expire in 2 minutes.</p>
                            </div>
                        `,
                    }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Resend API error (Register):", response.status, errorData);
                } else {
                    console.log("Resend API success (Register): Email sent to", args.email);
                }
            } catch (e) {
                console.error("Failed to fetch Resend API (Register):", e);
            }
        }

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
        console.log(`Attempting login for: ${email} (password length: ${args.password.length})`);
        
        const user = await ctx.runQuery(internal.auth_internal.getUserByEmail, { email });
        if (!user) {
            console.error(`User not found: ${email}`);
            throw new Error("Invalid email or password.");
        }
        
        // Check hash
        const isValid = await bcrypt.compare(args.password, user.passwordHash || "");
        console.log(`Password verification for ${email}: ${isValid}`);
        if (!isValid) {
            console.error(`Password mismatch for: ${email}`);
            // Diagnostic (only for internal dev): 
            console.log(`Stored hash starts with: ${user.passwordHash?.substring(0, 10)}...`);
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

        // Send Email via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.warn("⚠️ RESEND_API_KEY is NOT set in Convex Environment Variables. Skipping email send.");
        } else {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'CivicSentinel <onboarding@resend.dev>',
                        to: [args.email],
                        subject: 'Your new Verification Code',
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h1 style="color: #00D4FF;">JanSang AI</h1>
                                <p>Your new verification code is:</p>
                                <div style="font-size: 32px; font-weight: bold; background: #f4f4f4; padding: 15px; text-align: center; border-radius: 8px;">
                                    ${code}
                                </div>
                                <p style="color: #666; margin-top: 20px;">This code will expire in 2 minutes.</p>
                            </div>
                        `,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Resend API error (ResendCode):", response.status, errorData);
                } else {
                    console.log("Resend API success (ResendCode): Email sent to", args.email);
                }
            } catch (e) {
                console.error("Failed to fetch Resend API (ResendCode):", e);
            }
        }
        console.log(`Resent verification code for ${args.email}: ${code}`);
    },
});

export const forgotPassword = action({
    args: { email: v.string() },
    handler: async (ctx, args): Promise<void> => {
        const email = args.email.trim().toLowerCase();
        
        // 1. Check if user exists
        const user = await ctx.runQuery(internal.auth_internal.getUserByEmail, { email });
        if (!user) {
            throw new Error("No user found with this email address.");
        }

        // 2. Generate OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await ctx.runMutation(internal.auth_internal.saveVerificationCode, {
            email,
            code,
        });

        // 3. Send Email via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.warn("⚠️ RESEND_API_KEY is NOT set in Convex Environment Variables. Skipping email send.");
        } else {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'JanSang AI <onboarding@resend.dev>',
                        to: [email],
                        subject: 'Reset your JanSang AI Password',
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h1 style="color: #00D4FF;">JanSang AI</h1>
                                <p>You requested a password reset. Use the code below to set a new password:</p>
                                <div style="font-size: 32px; font-weight: bold; background: #f4f4f4; padding: 15px; text-align: center; border-radius: 8px;">
                                    ${code}
                                </div>
                                <p style="color: #666; margin-top: 20px;">This code will expire in 2 minutes for security.</p>
                                <p style="font-size: 12px; color: #999;">If you didn't request this, you can safely ignore this email.</p>
                            </div>
                        `,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Resend API error (ForgotPassword):", response.status, errorData);
                } else {
                        console.log("Resend API success (ForgotPassword): Email sent to", email);
                    }
                } catch (e) {
                    console.error("Failed to fetch Resend API (ForgotPassword):", e);
                }
            }
        },
    });
    
    export const resetPassword = action({
        args: { email: v.string(), code: v.string(), newPassword: v.string() },
        handler: async (ctx, args): Promise<void> => {
            const email = args.email.trim().toLowerCase();
            
            // Hash password securely via bcrypt
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(args.newPassword, saltRounds);
            
            // Validate code and update DB in one transaction
            await ctx.runMutation(internal.auth_internal.verifyAndSetPassword, {
                email,
                code: args.code,
                newPasswordHash: passwordHash
            });
        },
    });
