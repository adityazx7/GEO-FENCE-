import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal } from "./_generated/api";

export const translateText = action({
    args: {
        text: v.string(),
        targetLanguage: v.string(),
    },
    handler: async (ctx, args): Promise<string> => {
        // 1. Check Cache
        try {
            const cached = await ctx.runQuery(internal.ai_internal.getTranslation, {
                originalText: args.text,
                targetLanguage: args.targetLanguage
            });
            if (cached) {
                console.log(`Using cached translation for: ${args.targetLanguage}`);
                return cached;
            }
        } catch (e) {
            console.warn("Failed to check translation cache:", e);
        }

        // 2. Initialize Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is not set. Falling back to original text.");
            return args.text;
        }

        try {
            const trimmedKey = apiKey.trim();
            const genAI = new GoogleGenerativeAI(trimmedKey);
            
            const modelName = "gemini-flash-latest"; 
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `Translate the following text into ${args.targetLanguage}. Only return the direct translation, nothing else.\nText: "${args.text}"`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const translated = response.text().trim();
            
            if (translated && translated !== args.text) {
                // 3. Save to Cache
                await ctx.runMutation(internal.ai_internal.saveTranslation, {
                    originalText: args.text,
                    targetLanguage: args.targetLanguage,
                    translatedText: translated
                });
                console.log("Translation successful and cached!");
                return translated;
            }
            
            return translated || args.text;
        } catch (e: any) {
            // Check for 429 specifically
            if (e?.status === 429 || e?.message?.includes("429")) {
                console.warn("Gemini Quota Exceeded (429). Falling back to original text.");
            } else {
                console.error("Gemini Translation Error:", e?.message);
            }
            return args.text;
        }
    },
});
