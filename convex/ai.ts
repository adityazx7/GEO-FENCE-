import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const translateText = action({
    args: {
        text: v.string(),
        targetLanguage: v.string(),
    },
    handler: async (ctx, args) => {
        // Initialize Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is not set in environment variables. Falling back to original text.");
            return args.text;
        }

        try {
            console.log("Checking API Key length:", apiKey.length);
            const trimmedKey = apiKey.trim();
            const genAI = new GoogleGenerativeAI(trimmedKey);
            
            // Switching to gemini-flash-latest as gemini-2.0-flash reported limit:0 (quota not provisioned)
            const modelName = "gemini-flash-latest"; 
            console.log("Attempting translation with model:", modelName);
            
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `Translate the following text into ${args.targetLanguage}. Only return the direct translation, nothing else.\nText: "${args.text}"`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const translated = response.text().trim();
            
            if (!translated) {
                console.warn("Gemini returned empty text, falling back to original.");
                return args.text;
            }
            
            console.log("Translation successful!");
            return translated;
        } catch (e: any) {
            console.error("Gemini Translation Error Details:", JSON.stringify({
                message: e?.message,
                status: e?.status,
                statusText: e?.statusText,
                name: e?.name
            }, null, 2));
            return args.text; // Fallback to original text if API fails
        }
    },
});
