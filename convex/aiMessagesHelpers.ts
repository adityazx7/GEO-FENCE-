import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const saveMatrix = internalMutation({
  args: { projectId: v.id("projects"), matrix: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      aiMessages: args.matrix,
      messagesGenerated: true,
    });
  },
});

// Helper: pick the right message based on user persona + time + language
export function pickMessage(
  matrix: any,
  segment: string | undefined,
  language: string | undefined,
  projectName: string
): { title: string; body: string } {
  const persona = segment === "Commuter" ? "Commuter" : segment === "Parent" ? "Parent" : "Standard";
  const hour = new Date().getHours();
  const time = hour >= 6 && hour < 12 ? "Morning" : hour >= 12 && hour < 18 ? "Day" : "Night";
  const lang = language === "hi" ? "hi" : "en";

  const body = matrix?.[persona]?.[time]?.[lang] || `New government project near you: ${projectName}`;
  const title = lang === "hi" ? "आपके पड़ोस में सरकारी काम 🏗️" : "Government Work Near You 🏗️";
  return { title, body };
}
