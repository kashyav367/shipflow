/**
 * ================================================================
 * ShipFlow AI — PRD Chat Response Test Script
 * ================================================================
 * Tests the AI responses for:
 *  1. Clarification question generation  (analyze-request step)
 *  2. PRD document generation            (generate-prd step)
 *  3. Chat PRD assistant response        (sendChatMessage action)
 *
 * Run with:
 *   node test-ai-prd.mjs
 *
 * No database or Next.js required — calls OpenRouter directly.
 * ================================================================
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

// ── Load .env manually (no dotenv dependency needed) ─────────────
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

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const MODEL = "anthropic/claude-sonnet-4";

// ── ANSI color helpers ────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
};

function header(title) {
  const line = "═".repeat(60);
  console.log(`\n${c.cyan}${c.bold}${line}${c.reset}`);
  console.log(`${c.cyan}${c.bold}  ${title}${c.reset}`);
  console.log(`${c.cyan}${c.bold}${line}${c.reset}\n`);
}

function ok(label) {
  console.log(`${c.green}  ✔  ${label}${c.reset}`);
}

function warn(label) {
  console.log(`${c.yellow}  ⚠  ${label}${c.reset}`);
}

function fail(label, err) {
  console.log(`${c.red}  ✘  ${label}${c.reset}`);
  console.log(`${c.red}     ${err?.message || err}${c.reset}`);
}

function printResponse(text) {
  const lines = text.split("\n");
  for (const line of lines) {
    console.log(`${c.dim}    ${line}${c.reset}`);
  }
}

// ── Test cases definition ─────────────────────────────────────────

/**
 * TEST 1 — Clarification generation for a brief request
 * Expectation: needsClarification=true, exactly 1 question returned
 */
async function testClarificationBriefRequest() {
  header("TEST 1 · Clarification — Brief Feature Request");

  const feature = {
    title: "Add notifications",
    description: "Users should receive notifications.",
    clarifications: [],
  };

  console.log(`${c.bold}  Feature:${c.reset} ${feature.title}`);
  console.log(`${c.bold}  Desc:${c.reset}    ${feature.description}\n`);

  try {
    const response = await generateObject({
      model: openrouter(MODEL, { maxTokens: 500 }),
      schema: z.object({
        needsClarification: z.boolean(),
        questions: z
          .array(z.string())
          .describe("List of questions, empty if none needed"),
      }),
      prompt: `You are an expert AI Product Manager. Analyze this feature request and determine if we have enough information to write a comprehensive, developer-ready PRD.

Title: ${feature.title}
Description: ${feature.description}

Clarification Q&A History:
${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || "No response yet"}`).join("\n\n") || "(none yet)"}

Guidelines:
1. If the request is still very brief, ask exactly 1 specific, high-impact question.
2. If the user answered previous questions, only ask a follow-up if critical technical ambiguity remains.
3. Keep it turn-by-turn. Only ask at most 1 question in this turn.
4. Focus on data models, integrations, validation, and technical constraints.

Return needsClarification=true with exactly 1 question if more detail is required; otherwise return needsClarification=false and no questions.`,
    });

    const obj = response.object;
    console.log(`${c.bold}  AI Decision:${c.reset}`);
    console.log(`    needsClarification = ${c.magenta}${obj.needsClarification}${c.reset}`);
    console.log(`    questions.length   = ${c.magenta}${obj.questions.length}${c.reset}`);

    if (obj.needsClarification) {
      ok("Correctly flagged as needing clarification");
    } else {
      warn("AI said no clarification needed for a very brief request — check prompt");
    }

    if (obj.questions.length === 1) {
      ok("Returned exactly 1 question (correct)");
      console.log(`\n${c.bold}  Question:${c.reset}`);
      console.log(`${c.blue}    "${obj.questions[0]}"${c.reset}\n`);
    } else if (obj.questions.length > 1) {
      warn(`Returned ${obj.questions.length} questions (expected 1) — AI may be ignoring the turn-by-turn constraint`);
      for (const q of obj.questions) {
        console.log(`${c.yellow}    - ${q}${c.reset}`);
      }
    } else {
      fail("Returned 0 questions despite needsClarification=true");
    }
  } catch (err) {
    fail("Test 1 threw an error", err);
  }
}

/**
 * TEST 2 — Clarification after 1 Q&A round
 * Expectation: Either ask 1 follow-up OR decide ready for PRD
 */
async function testClarificationAfterOneAnswer() {
  header("TEST 2 · Clarification — After 1 Q&A Round");

  const feature = {
    title: "User notification system",
    description: "Users should receive real-time notifications for activity in their workspace.",
    clarifications: [
      {
        question: "What channels should notifications be delivered through — in-app, email, push, or a combination?",
        answer: "We need in-app real-time notifications and email digests. Push notifications are out of scope for V1.",
      },
    ],
  };

  console.log(`${c.bold}  Feature:${c.reset} ${feature.title}`);
  console.log(`${c.bold}  After:${c.reset}   1 Q&A round\n`);

  try {
    const response = await generateObject({
      model: openrouter(MODEL, { maxTokens: 500 }),
      schema: z.object({
        needsClarification: z.boolean(),
        questions: z.array(z.string()).describe("At most 1 question"),
      }),
      prompt: `You are an expert AI Product Manager. Analyze this feature request and determine if we have enough information to write a comprehensive, developer-ready PRD.

Title: ${feature.title}
Description: ${feature.description}

Clarification Q&A History:
${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || "No response yet"}`).join("\n\n")}

Guidelines:
1. If the request is still very brief, ask exactly 1 specific, high-impact question.
2. If the user answered previous questions, only ask a follow-up if critical technical ambiguity remains.
3. Keep it turn-by-turn. Only ask at most 1 question in this turn.
4. Focus on data models, integrations, validation, and technical constraints.

Return needsClarification=true with exactly 1 question if more detail is required; otherwise return needsClarification=false and no questions.`,
    });

    const obj = response.object;
    console.log(`${c.bold}  AI Decision:${c.reset}`);
    console.log(`    needsClarification = ${c.magenta}${obj.needsClarification}${c.reset}`);
    console.log(`    questions.length   = ${c.magenta}${obj.questions.length}${c.reset}`);

    if (!obj.needsClarification && obj.questions.length === 0) {
      ok("AI decided enough info to generate PRD — moving to generation");
    } else if (obj.needsClarification && obj.questions.length === 1) {
      ok("AI asked 1 follow-up question (valid)");
      console.log(`\n${c.bold}  Follow-up Question:${c.reset}`);
      console.log(`${c.blue}    "${obj.questions[0]}"${c.reset}\n`);
    } else if (obj.questions.length > 1) {
      warn(`AI returned ${obj.questions.length} questions — should be max 1`);
    }
  } catch (err) {
    fail("Test 2 threw an error", err);
  }
}

/**
 * TEST 3 — PRD Generation after all clarifications done
 * Expectation: Returns markdown with all 5 sections
 */
async function testPrdGeneration() {
  header("TEST 3 · PRD Generation — Full Flow");

  const feature = {
    title: "User notification system",
    description: "Real-time notifications for workspace activities in ShipFlow.",
    clarifications: [
      {
        question: "What delivery channels are needed?",
        answer: "In-app real-time + email digest. No push for V1.",
      },
      {
        question: "What triggers a notification?",
        answer: "PR review requests, feature status changes, team member mentions, and comment replies.",
      },
      {
        question: "Should users be able to configure notification preferences per-channel?",
        answer: "Yes — users should be able to toggle each notification type on/off per delivery channel.",
      },
    ],
  };

  const clarificationsText = feature.clarifications
    .map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer}`)
    .join("\n");

  console.log(`${c.bold}  Feature:${c.reset}       ${feature.title}`);
  console.log(`${c.bold}  Clarifications:${c.reset} ${feature.clarifications.length} Q&As\n`);

  try {
    const response = await generateText({
      model: openrouter(MODEL, { maxTokens: 3000 }),
      prompt: `You are a senior Product Manager. Write a concise, actionable Product Requirements Document (PRD) in Markdown for this feature:

Title: ${feature.title}
Description: ${feature.description}

User Clarifications:
${clarificationsText}

Write the PRD using ONLY these 5 sections. Keep it focused and practical — no filler, no boilerplate:

## 1. Summary
2-3 sentences: What are we building and why? Who is the target user?

## 2. Goals & Non-Goals
- **Goals**: 3-5 bullet points of what this feature must achieve.
- **Non-Goals**: 2-3 things explicitly out of scope for this version.

## 3. User Stories
Write 3-6 user stories in "As a [user], I want [action] so that [benefit]" format. Cover the core happy path and 1-2 edge cases.

## 4. Technical Approach
High-level architecture guidance in 4-8 bullet points. Mention key components, data flow, and integration points. Do NOT write code, schemas, or API specs — keep it directional.

## 5. Acceptance Criteria
Write 5-10 concrete, testable acceptance criteria as a checklist. Each item should be verifiable by a QA engineer.

IMPORTANT RULES:
- Total length should be 300-500 words. Do NOT exceed this.
- Use clear, simple language. Avoid jargon.
- Be specific to this feature, not generic.
- Use Markdown formatting (headers, bullet points, checkboxes).`,
    });

    const prd = response.text;
    const wordCount = prd.split(/\s+/).length;

    // Validate sections
    const sections = [
      "## 1. Summary",
      "## 2. Goals",
      "## 3. User Stories",
      "## 4. Technical Approach",
      "## 5. Acceptance Criteria",
    ];

    const missingSections = sections.filter((s) => !prd.includes(s.substring(0, 15)));

    console.log(`${c.bold}  Word count:${c.reset} ${c.magenta}${wordCount}${c.reset} (target: 300-500)`);

    if (wordCount >= 300 && wordCount <= 600) {
      ok("Word count is within acceptable range");
    } else if (wordCount > 600) {
      warn(`Word count ${wordCount} exceeds 500 — AI may be ignoring the length constraint`);
    } else {
      warn(`Word count ${wordCount} is too short — PRD may be incomplete`);
    }

    if (missingSections.length === 0) {
      ok("All 5 required sections are present");
    } else {
      fail(`Missing sections: ${missingSections.join(", ")}`);
    }

    const hasCheckboxes = prd.includes("- [ ]") || prd.includes("- [x]");
    if (hasCheckboxes) {
      ok("Acceptance criteria use checkbox format");
    } else {
      warn("Acceptance criteria may not use checkbox format");
    }

    const hasUserStories = prd.includes("As a ");
    if (hasUserStories) {
      ok("User stories are in correct 'As a...' format");
    } else {
      warn("User stories may not follow the expected format");
    }

    console.log(`\n${c.bold}  === Generated PRD ===${c.reset}`);
    printResponse(prd);
  } catch (err) {
    fail("Test 3 threw an error", err);
  }
}

/**
 * TEST 4 — Chat PRD assistant response
 * Expectation: Helpful, context-aware, concise reply about the PRD
 */
async function testChatPrdResponse() {
  header("TEST 4 · Chat PRD Assistant — Response Quality");

  const feature = {
    title: "User notification system",
    description: "Real-time notifications for workspace activities.",
    clarifications: [
      {
        question: "What channels are needed?",
        answer: "In-app + email digest",
      },
    ],
  };

  const prdContext = `## 1. Summary
ShipFlow notification system delivers real-time in-app alerts and scheduled email digests...

## 2. Goals & Non-Goals
- Goals: Real-time delivery, user preferences, email digests
- Non-Goals: Push notifications in V1`;

  const testMessages = [
    {
      label: "Ask to add push notifications to PRD",
      userMessage: "Can you update the PRD to include push notifications as a goal?",
    },
    {
      label: "Ask about technical approach",
      userMessage: "What database schema should we use for storing notification preferences?",
    },
    {
      label: "Vague/off-topic message",
      userMessage: "What is the capital of France?",
    },
  ];

  const clarificationContext = feature.clarifications
    .map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || "Pending"}`)
    .join("\n\n");

  for (const testCase of testMessages) {
    console.log(`${c.bold}  ▶ ${testCase.label}${c.reset}`);
    console.log(`${c.dim}  User: "${testCase.userMessage}"${c.reset}\n`);

    try {
      const aiResult = await generateText({
        model: openrouter(MODEL, { maxTokens: 500 }),
        prompt: `You are ShipFlow AI, a helpful Product Requirements assistant. You help users refine feature requests and create better PRDs.

Feature Request:
Title: ${feature.title}
Description: ${feature.description}

Clarification Q&A:
${clarificationContext}

Current PRD:
${prdContext}

Recent Chat History:
(none)

User's latest message: ${testCase.userMessage}

Respond helpfully to the user's message. Be concise, actionable, and focus on improving the feature requirements. If they ask about the PRD, provide specific suggestions. If they ask questions, answer based on the feature context.`,
      });

      const reply = aiResult.text;
      const wordCount = reply.split(/\s+/).length;

      if (reply && reply.length > 0) {
        ok(`Got a response (${wordCount} words)`);
      } else {
        fail("Empty response from AI");
      }

      // Check if response is PRD-relevant for PRD questions
      if (testCase.userMessage.includes("PRD") || testCase.userMessage.includes("push")) {
        const mentionsPrd = reply.toLowerCase().includes("prd") || reply.toLowerCase().includes("notification") || reply.toLowerCase().includes("push");
        if (mentionsPrd) {
          ok("Response is relevant to the PRD topic");
        } else {
          warn("Response may not be addressing the PRD topic");
        }
      }

      console.log(`\n${c.bold}  AI Reply:${c.reset}`);
      printResponse(reply);
      console.log();
    } catch (err) {
      fail(`Test 4 (${testCase.label}) threw an error`, err);
    }
  }
}

/**
 * TEST 5 — Edge case: AI with 3 clarifications forces PRD generation (shouldClarify=false)
 * Expectation: When we skip clarification (force=true), PRD should still be valid
 */
async function testForcedPrdAfterMaxClarifications() {
  header("TEST 5 · Edge Case — Max Clarifications (Force PRD)");

  // Simulate what happens when clarifications.length >= 3
  // The code sets shouldClarify = false and goes straight to PRD
  const feature = {
    title: "Shopping cart feature",
    description: "Add a shopping cart",
    clarifications: [
      { question: "Q1?", answer: "A1" },
      { question: "Q2?", answer: "A2" },
      { question: "Q3?", answer: "A3" },
    ],
  };

  console.log(`${c.bold}  Simulating:${c.reset} Feature with ${feature.clarifications.length} clarifications (>= 3) -> force PRD`);
  console.log(`${c.dim}  (In real code: shouldClarify = clarifications.length < 3 -> false)${c.reset}\n`);

  try {
    const prdResponse = await generateText({
      model: openrouter(MODEL, { maxTokens: 3000 }),
      prompt: `You are a senior Product Manager. Write a concise, actionable Product Requirements Document (PRD) in Markdown for this feature:

Title: ${feature.title}
Description: ${feature.description}

User Clarifications:
${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer}`).join("\n")}

Write the PRD using ONLY these 5 sections. Keep it focused and practical — no filler, no boilerplate:

## 1. Summary
2-3 sentences: What are we building and why? Who is the target user?

## 2. Goals & Non-Goals
- **Goals**: 3-5 bullet points of what this feature must achieve.
- **Non-Goals**: 2-3 things explicitly out of scope for this version.

## 3. User Stories
Write 3-6 user stories in "As a [user], I want [action] so that [benefit]" format.

## 4. Technical Approach
High-level architecture guidance in 4-8 bullet points.

## 5. Acceptance Criteria
Write 5-10 concrete, testable acceptance criteria as a checklist.

IMPORTANT: Keep total length 300-500 words. Be specific, not generic.`,
    });

    const prd = prdResponse.text;
    const wordCount = prd.split(/\s+/).length;

    console.log(`${c.bold}  Word count:${c.reset} ${c.magenta}${wordCount}${c.reset}`);

    if (prd.length > 100) {
      ok("PRD was generated even with minimal clarification answers (Q1?, Q2?, Q3?)");
    } else {
      fail("PRD content is too short or empty");
    }

    console.log(`\n${c.bold}  PRD Preview (first 10 lines):${c.reset}`);
    const preview = prd.split("\n").slice(0, 10).join("\n");
    printResponse(preview);
    console.log(`${c.dim}  ...${c.reset}\n`);
  } catch (err) {
    fail("Test 5 threw an error", err);
  }
}

// ── Main runner ───────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}${c.cyan}ShipFlow AI — PRD Chat Test Suite${c.reset}`);
  console.log(`${c.dim}Model: ${MODEL}${c.reset}`);
  console.log(`${c.dim}Time:  ${new Date().toISOString()}${c.reset}\n`);

  if (!process.env.OPENROUTER_API_KEY) {
    console.error(`${c.red}ERROR: OPENROUTER_API_KEY not found in .env${c.reset}`);
    process.exit(1);
  }

  ok(`API key loaded: ${process.env.OPENROUTER_API_KEY.substring(0, 20)}...`);

  try {
    await testClarificationBriefRequest();
    await testClarificationAfterOneAnswer();
    await testPrdGeneration();
    await testChatPrdResponse();
    await testForcedPrdAfterMaxClarifications();
  } catch (err) {
    console.error(`\n${c.red}Unexpected fatal error:${c.reset}`, err);
    process.exit(1);
  }

  console.log(`\n${c.green}${c.bold}=======================================`);
  console.log(`  All tests completed.`);
  console.log(`=======================================${c.reset}\n`);
}

main();
