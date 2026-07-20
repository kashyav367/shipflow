import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf-8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
  if (!process.env[k]) process.env[k] = v;
}

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const clr = {
  reset: "\x1b[0m", bold: "\x1b[1m", cyan: "\x1b[36m",
  green: "\x1b[32m", red: "\x1b[31m", magenta: "\x1b[35m", dim: "\x1b[2m", blue: "\x1b[34m",
};
const timer = () => { const s = Date.now(); return () => ((Date.now() - s) / 1000).toFixed(2) + "s"; };
const sep = () => console.log(clr.cyan + clr.bold + "─".repeat(50) + clr.reset);

async function testPrd() {
  sep();
  console.log(clr.cyan + clr.bold + "  TEST 1: PRD Generation (claude-sonnet-4, max 800 tokens)" + clr.reset);
  sep();
  console.log();
  const el = timer();
  try {
    const r = await generateText({
      model: openrouter("anthropic/claude-sonnet-4", { maxTokens: 800 }),
      prompt: [
        "Write a SHORT PRD (max 150 words) for: landing page with hero, features, pricing sections.",
        "",
        "Use ONLY these 3 sections:",
        "## Summary",
        "1-2 sentences.",
        "",
        "## Key Requirements",
        "4-6 bullets.",
        "",
        "## Acceptance Criteria",
        "4-6 checkboxes.",
        "",
        "No extra sections. Be concise.",
      ].join("\n"),
    });
    const t = el();
    const words = r.text.split(/\s+/).length;
    console.log(clr.green + "  DONE in " + clr.bold + t + clr.reset + clr.green + " | " + words + " words" + clr.reset);
    console.log("\n" + clr.dim + r.text.split("\n").map((l) => "    " + l).join("\n") + clr.reset);
    return { ok: true, time: t, prd: r.text };
  } catch (e) {
    const t = el();
    console.log(clr.red + "  FAILED in " + t + ": " + e.message + clr.reset);
    return { ok: false, time: t, prd: null };
  }
}

async function testTasks(prd) {
  sep();
  console.log(clr.cyan + clr.bold + "  TEST 2: Task Generation (gpt-4o-mini, max 800 tokens)" + clr.reset);
  sep();
  console.log();
  const el = timer();
  try {
    const r = await generateObject({
      model: openrouter("openai/gpt-4o-mini", { maxTokens: 800 }),
      schema: z.object({
        tasks: z.array(
          z.object({
            title: z.string().describe("Short task title 5-8 words"),
            description: z.string().describe("1-2 sentence implementation note"),
          })
        ).describe("3-5 developer tasks"),
      }),
      prompt: "Break this PRD into 3-5 dev tasks. Short title + 1 sentence each.\n\nPRD:\n" + prd,
    });
    const t = el();
    const tasks = r.object.tasks;
    console.log(clr.green + "  DONE in " + clr.bold + t + clr.reset + clr.green + " | " + tasks.length + " tasks generated" + clr.reset);
    tasks.forEach((task, i) => {
      console.log("\n  " + clr.blue + (i + 1) + ". " + task.title + clr.reset);
      console.log("     " + clr.dim + task.description + clr.reset);
    });
    return { ok: true, time: t };
  } catch (e) {
    const t = el();
    console.log(clr.red + "  FAILED in " + t + ": " + e.message + clr.reset);
    return { ok: false, time: t };
  }
}

async function main() {
  console.log("\n" + clr.bold + clr.cyan + "ShipFlow Speed Benchmark" + clr.reset + "  " + clr.dim + new Date().toLocaleTimeString() + clr.reset + "\n");
  if (!process.env.OPENROUTER_API_KEY) {
    console.error(clr.red + "ERROR: OPENROUTER_API_KEY not in .env" + clr.reset);
    process.exit(1);
  }
  console.log(clr.dim + "  API Key: " + process.env.OPENROUTER_API_KEY.substring(0, 20) + "..." + clr.reset + "\n");

  const total = timer();
  const p = await testPrd();
  const tk = p.ok ? await testTasks(p.prd) : { ok: false, time: "skipped" };
  const tt = total();

  sep();
  console.log(clr.cyan + clr.bold + "  SUMMARY" + clr.reset);
  sep();
  console.log("  " + (p.ok ? clr.green + "PASS" : clr.red + "FAIL") + clr.reset + "  PRD Generation   " + clr.bold + p.time + clr.reset);
  console.log("  " + (tk.ok ? clr.green + "PASS" : clr.red + "FAIL") + clr.reset + "  Task Generation  " + clr.bold + tk.time + clr.reset);
  console.log("  " + clr.dim + "─".repeat(35) + clr.reset);
  const sec = parseFloat(tt);
  const verdict = sec < 15 ? "🚀 FAST (under 15s)" : sec < 30 ? "⚡ OK (15-30s)" : "🐢 SLOW (over 30s — needs work)";
  console.log("\n  " + clr.bold + "TOTAL: " + clr.magenta + tt + clr.reset + "  " + verdict + "\n");
}

main();
