"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Called automatically when a new project is created
// Generates 18 AI message variants: 3 personas × 3 times × 2 languages
export const generateForProject = action({
  args: {
    projectId: v.id("projects"),
    projectName: v.string(),
    projectType: v.string(),
    projectStatus: v.string(),
    projectImpact: v.string(),
    projectDescription: v.string(),
  },
  handler: async (ctx, args) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return;

    const prompt = `
You are a municipal communication AI for Indian government infrastructure projects.
A new project was created: "${args.projectName}" (${args.projectType}).
Status: ${args.projectStatus}. Impact: ${args.projectImpact}.
Description: ${args.projectDescription}

Generate exactly 18 short, friendly push notification messages (max 60 words each) for citizens who walk near this site.

Structure — 3 Personas × 3 Times × 2 Languages = 18 messages:
- Personas: "Standard" (general citizen), "Commuter" (daily travelers), "Parent" (families/children/safety)
- Times: "Morning" (6am-12pm), "Day" (12pm-6pm), "Night" (6pm-12am)
- Languages: "en" (English, simple Grade-5 level), "hi" (Hindi, conversational)

Each message must:
1. Start with an emoji relevant to the project type
2. Name the project specifically
3. Explain what's being built and WHY it helps them personally
4. Be warm, positive, and civic-minded
5. Max 60 words

Return ONLY raw JSON, no markdown:
{
  "Standard": {
    "Morning": { "en": "...", "hi": "..." },
    "Day": { "en": "...", "hi": "..." },
    "Night": { "en": "...", "hi": "..." }
  },
  "Commuter": {
    "Morning": { "en": "...", "hi": "..." },
    "Day": { "en": "...", "hi": "..." },
    "Night": { "en": "...", "hi": "..." }
  },
  "Parent": {
    "Morning": { "en": "...", "hi": "..." },
    "Day": { "en": "...", "hi": "..." },
    "Night": { "en": "...", "hi": "..." }
  }
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data: any = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const matrix = JSON.parse(clean);

      await ctx.runMutation(internal.aiMessagesHelpers.saveMatrix, {
        projectId: args.projectId,
        matrix,
      });
    } catch (e) {
      console.error("[AI Matrix] Generation failed:", e);
    }
  },
});
