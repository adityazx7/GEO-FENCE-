import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getTranslation = internalQuery({
    args: { originalText: v.string(), targetLanguage: v.string() },
    handler: async (ctx, args): Promise<string | null> => {
        const cached = await ctx.db.query("translationCache")
            .withIndex("by_original_text", q => 
                q.eq("originalText", args.originalText).eq("targetLanguage", args.targetLanguage)
            )
            .first();
        return cached?.translatedText || null;
    },
});

export const saveTranslation = internalMutation({
    args: { originalText: v.string(), targetLanguage: v.string(), translatedText: v.string() },
    handler: async (ctx, args): Promise<void> => {
        // Check if it already exists to avoid duplicates
        const existing = await ctx.db.query("translationCache")
            .withIndex("by_original_text", q => 
                q.eq("originalText", args.originalText).eq("targetLanguage", args.targetLanguage)
            )
            .first();
        
        if (!existing) {
            await ctx.db.insert("translationCache", {
                originalText: args.originalText,
                targetLanguage: args.targetLanguage,
                translatedText: args.translatedText,
                createdAt: Date.now(),
            });
        }
    },
});
