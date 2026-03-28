"use node";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

async function buildContext(ctx: any): Promise<string> {
  const zones = await ctx.runQuery(api.geoFences.listActive);
  const records = await ctx.runQuery(api.accountability.listAll);
  const projects = await ctx.runQuery(api.projects.list);

  const zonesSummary = (zones || [])
    .map((z: any) => `• ${z.name} | Type: ${z.type} | Radius: ${z.radius}m | Status: ${z.status} | Triggers: ${z.triggerCount}`)
    .join("\n");

  const recordsSummary = (records || [])
    .map((r: any) => `• ${r.zoneName}: Official=${r.officialName} (${r.officialPost}, ${r.partyName}) | Promise="${r.projectClaim}" | Deadline=${r.claimedCompletionDate} | Status=${r.actualStatus} | Blockchain=${r.txHash ? "✅ Verified" : "⏳ Pending"}`)
    .join("\n");

  const projectsSummary = (projects || [])
    .slice(0, 20)
    .map((p: any) => `• ${p.name} | ₹${(p.budget / 100000).toFixed(1)}L budget | Status: ${p.status} | Impact: ${p.impact}`)
    .join("\n");

  return `
=== ACTIVE GEO-FENCED GOVERNMENT ZONES ===
${zonesSummary || "No zones configured yet."}

=== GOVERNMENT ACCOUNTABILITY RECORDS (Blockchain-Verified) ===
${recordsSummary || "No records yet."}

=== INFRASTRUCTURE PROJECTS ===
${projectsSummary || "No projects yet."}

=== PLATFORM INFO ===
• JanSang AI — India's geo-fencing civic transparency engine
• Real-time notifications when citizens enter government project zones
• Blockchain: Polygon Amoy testnet for tamper-proof official accountability
• AI: Gemini 2.5 Flash for personalized, multilingual notifications
`.trim();
}

export const chat = action({
  args: {
    question: v.string(),
    language: v.optional(v.string()),
    history: v.optional(v.array(v.object({ role: v.string(), content: v.string() }))),
  },
  handler: async (ctx, args): Promise<string> => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return "⚠️ AI not configured.";

    const context = await buildContext(ctx);
    const lang = args.language === "hi" ? "Hindi" : "English";

    const systemPrompt = `You are JanSang AI — India's civic transparency assistant. You help citizens understand government projects near them, track official accountability, and report issues.

You have LIVE data from the platform:
${context}

RULES:
- Answer ONLY based on the data above. If unsure, say so honestly.
- Be conversational, helpful, and concise. Use simple language.
- Respond in ${lang}.
- When mentioning officials, include their post and party.
- For projects, mention budget in lakhs/crores and current status.
- For accountability, highlight if promises were kept or delayed.
- Format for mobile: short paragraphs, use bullet points for lists.
- Be politically neutral at all times.`;

    const fullQuestion = args.history && args.history.length > 0
      ? `Previous chat:\n${args.history.map((h) => `${h.role}: ${h.content}`).join("\n")}\n\nNow: ${args.question}`
      : args.question;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\n\nCitizen question: " + fullQuestion }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500, topP: 0.9 },
          }),
        }
      );
      const data: any = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "I couldn't process that. Please try again.";
    } catch (e) {
      return "⚠️ Connection issue. Please try again.";
    }
  },
});
