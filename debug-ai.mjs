import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
  if (!process.env[key]) process.env[key] = value;
}

console.log("=== SHIPFLOW AI DEBUG ===");
console.log("API KEY:", process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 25) + "..." : "NOT FOUND");

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

// TEST 1: Exact same generateObject call as features.ts clarification step
console.log("\n[TEST 1] generateObject - Clarification (same as features.ts)...");
try {
  const response = await generateObject({
    model: openrouter("anthropic/claude-sonnet-4", { maxTokens: 800 }),
    mode: "json",
    schema: z.object({
      needsClarification: z.boolean(),
      questions: z.array(z.string()).describe("List of questions, empty if none needed"),
    }),
    prompt: `You are an expert AI Product Manager. Analyze this feature request and determine if we have enough information to write a comprehensive, developer-ready PRD.

Title: Dark Mode
Description: Add dark mode to the app.

Clarification Q&A History:
(none yet)

Guidelines:
1. If the request is still very brief, ask exactly 1 specific, high-impact question.
2. Only ask at most 1 question in this turn.

Return needsClarification=true with exactly 1 question if more detail is required; otherwise return needsClarification=false and no questions.`,
  });

  console.log("SUCCESS!");
  console.log("  needsClarification:", response.object.needsClarification);
  console.log("  questions:", response.object.questions);
} catch (err) {
  console.error("FAILED!");
  console.error("  Error:", err.message);
  if (err.responseBody) console.error("  Response body:", err.responseBody);
  if (err.cause) console.error("  Cause:", err.cause?.message);
}

// TEST 2: generateText - PRD generation (same as features.ts PRD step)
console.log("\n[TEST 2] generateText - PRD generation (same as features.ts)...");
try {
  const response = await generateText({
    model: openrouter("anthropic/claude-sonnet-4", { maxTokens: 2000 }),
    prompt: `You are a senior Product Manager. Write a very short PRD (max 50 words) for: Title: Dark Mode`,
  });

  console.log("SUCCESS!");
  console.log("  Text preview:", response.text.substring(0, 100) + "...");
} catch (err) {
  console.error("FAILED!");
  console.error("  Error:", err.message);
  if (err.responseBody) console.error("  Response body:", err.responseBody);
  if (err.cause) console.error("  Cause:", err.cause?.message);
}

console.log("\n=== DONE ===");
