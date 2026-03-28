"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const submitWithAITriage = action({
  args: {
    userId: v.string(),
    projectId: v.optional(v.id("projects")),
    location: v.object({ lat: v.number(), lng: v.number(), address: v.optional(v.string()) }),
    imageBase64: v.optional(v.string()),
    description: v.string(),
    category: v.union(v.literal("road_damage"), v.literal("water_leak"), v.literal("street_light"), v.literal("garbage"), v.literal("construction_delay"), v.literal("other")),
  },
  handler: async (ctx, args): Promise<{ status: string; issueId?: any; aiSeverity?: number; reason?: string }> => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    let aiCategory = args.category;
    let aiSeverity = 5;
    let aiDescription = args.description;
    let isSpam = false;

    if (args.imageBase64 && GEMINI_API_KEY) {
      try {
        const prompt = `Analyze this image submitted as a civic infrastructure complaint.
If it is NOT outdoor public infrastructure (e.g., indoor room, selfie, random object, screenshot, blurry/unclear), return: {"isSpam": true, "category": "Spam", "severity": 0, "description": "Not a valid civic issue"}
Otherwise, return:
{"isSpam": false, "category": "road_damage|water_leak|street_light|garbage|construction_delay|other", "severity": 1-10 (10=most urgent), "description": "brief description of the issue in 15 words"}
Return ONLY raw JSON.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: "image/jpeg", data: args.imageBase64 } },
                ],
              }],
            }),
          }
        );
        const data: any = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(clean);

        isSpam = result.isSpam ?? false;
        aiCategory = result.category || args.category;
        aiSeverity = result.severity ?? 5;
        aiDescription = result.description || args.description;
      } catch (e) {
        console.error("[AI Triage] Failed:", e);
      }
    }

    if (isSpam) return { status: "rejected", reason: "AI detected this is not a valid civic issue" };

    const issueId = await ctx.runMutation(api.issues.create, {
      userId: args.userId,
      projectId: args.projectId,
      location: args.location,
      description: args.description,
      category: args.category as any,
      aiCategory,
      aiSeverity,
      aiDescription,
      isSpam: false,
    });

    if (aiSeverity >= 7) {
      try {
        const AMOY_RPC = process.env.AMOY_RPC_URL;
        const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
        if (AMOY_RPC && PRIVATE_KEY) {
          const { ethers } = await import("ethers");
          const provider = new ethers.JsonRpcProvider(AMOY_RPC);
          const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
          const payload = `${issueId}|${args.userId}|${args.category}|severity:${aiSeverity}`;
          const tx = await wallet.sendTransaction({
            to: wallet.address,
            value: 0n,
            data: ethers.hexlify(ethers.toUtf8Bytes(payload)),
          });
          await ctx.runMutation(api.issues.updateTxHash, { issueId: issueId as any, txHash: tx.hash });
        }
      } catch (e) {
        console.error("[Blockchain] Issue notarization failed:", e);
      }
    }

    return { status: "success", issueId, aiSeverity };
  },
});
