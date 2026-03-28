"use node";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const anchorOnChain = action({
  args: {
    recordId: v.id("accountabilityRecords"),
    dataHash: v.string(),
  },
  handler: async (ctx, args) => {
    const AMOY_RPC = process.env.AMOY_RPC_URL;
    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

    let txHash: string;
    let explorerUrl: string;
    let network: string;

    if (AMOY_RPC && PRIVATE_KEY) {
      try {
        const { ethers } = await import("ethers");
        const provider = new ethers.JsonRpcProvider(AMOY_RPC);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        const tx = await wallet.sendTransaction({
          to: wallet.address,
          value: 0n,
          data: ethers.hexlify(ethers.toUtf8Bytes(args.dataHash)),
        });

        txHash = tx.hash;
        network = "polygon_amoy";
        explorerUrl = `https://amoy.polygonscan.com/tx/${tx.hash}`;
      } catch (e) {
        console.error("[Blockchain] Amoy transaction failed, using simulated:", e);
        txHash = "0x" + (await sha256(args.dataHash + Date.now()));
        network = "simulated";
        explorerUrl = `Simulated — configure AMOY_RPC_URL and WALLET_PRIVATE_KEY`;
      }
    } else {
      txHash = "0x" + (await sha256(args.dataHash + Date.now()));
      network = "demo_hash";
      explorerUrl = `Demo mode — hash: ${txHash}`;
    }

    await ctx.runMutation(api.accountability.updateTxHash, {
      recordId: args.recordId,
      txHash,
      explorerUrl,
    });

    return { txHash, explorerUrl, network };
  },
});

export const generateForOGDZone = action({
  args: {
    zoneId: v.string(),
    zoneName: v.string(),
    district: v.string(),
    state: v.string(),
    facilityType: v.string(),
  },
  handler: async (ctx, args) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return;

    const prompt = `Generate a realistic Indian government accountability record for a ${args.facilityType} in ${args.district}, ${args.state}.
Return ONLY raw JSON:
{
  "officialName": "realistic Indian name",
  "officialPost": "one of: District Collector, Municipal Commissioner, MLA, PWD Engineer, Nagarsevak",
  "partyName": "one of: BJP, INC, AAP, NCP, TMC, Independent",
  "projectClaim": "one specific promise this official made about this facility (max 20 words)",
  "startDate": "YYYY-MM-DD (within last 3 years)",
  "claimedCompletionDate": "YYYY-MM-DD (6-24 months from start)",
  "actualStatus": "one of: On Track, Delayed by 3 months, Completed ahead of schedule, Under review, Funds released"
}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data: any = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const record = JSON.parse(clean);

      const result: any = await ctx.runMutation(api.accountability.createRecord, {
        zoneId: args.zoneId,
        zoneName: args.zoneName,
        ...record,
      });

      if (result.recordId && !result.skipped) {
        await ctx.runAction(api.accountabilityActions.anchorOnChain, {
          recordId: result.recordId,
          dataHash: result.dataHash,
        });
      }
    } catch (e) {
      console.error("[Blockchain] Auto-generate failed:", e);
    }
  },
});
