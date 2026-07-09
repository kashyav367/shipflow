import { inngest } from "@/features/inngest/client";
import { prisma } from "@/lib/db";
import { generateText, generateObject } from "ai";
import { openrouter } from "@/features/ai";
import { z } from "zod";

export const generateFeaturePrd = inngest.createFunction(
  { 
    id: "generate-feature-prd", 
    triggers: [
      { event: "feature/request.received" },
      { event: "feature/clarification.answered" }
    ] 
  },
  async ({ event, step }) => {
    const featureRequestId = event.data?.featureRequestId || event.data;

    if (!featureRequestId) {
      console.error("Event data structure:", event.data);
      throw new Error("Missing 'featureRequestId' in event data payload.");
    }

    // Fetch the feature request and any existing clarifications
    const feature = await step.run("get-feature", async () => {
      return prisma.featureRequest.findUnique({
        where: { id: featureRequestId },
        include: { clarifications: true },
      });
    });

    if (!feature) return;

    // If we already have 3 or more clarifications, we force it to proceed to generate PRD
    const shouldClarify = feature.clarifications.length < 3;

    // Call AI to decide if it needs clarification or is ready for PRD
    const analysis = await step.run("analyze-request", async () => {
      if (!shouldClarify) {
        return { needsClarification: false, questions: [] };
      }

      const response = await generateObject({
        model: openrouter("anthropic/claude-3-5-sonnet", { maxTokens: 1000 }),
        schema: z.object({
          needsClarification: z.boolean(),
          questions: z.array(z.string()).describe("List of questions to clarify requirements, empty if none needed"),
        }),
        prompt: `You are an expert AI Product Manager. Analyze this feature request and determine if we have enough information to write a clear, actionable Product Requirements Document (PRD).

        Title: ${feature.title}
        Description: ${feature.description}

        Clarification Q&A History:
        ${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || "No response yet"}`).join("\n\n")}

        Guidelines for clarification:
        1. If this is the initial request and it is very brief (less than 2-3 sentences), we need more details. Set needsClarification to true and ask exactly 1 specific, high-impact question about the core flow, scope, or technical constraints.
        2. If the user has answered the previous questions, analyze their response. Only ask a follow-up question if there is a critical technical ambiguity preventing you from writing DB or API specs.
        3. Keep it turn-by-turn. ONLY ask at most 1 question in this turn.
        4. Focus on deep engineering impact: What are the data models? What are the integration points? Are there strict validation limits?

        Response format:
        - If we lack critical information: set needsClarification = true and write exactly 1 precise, intelligent question.
        - Otherwise: set needsClarification = false and leave questions empty.`
      });

      return response.object;
    });

    const questions = analysis.questions.slice(0, 1);

    if (analysis.needsClarification && questions.length > 0) {
      // Save new clarification question
      await step.run("save-questions", async () => {
        await prisma.clarificationQuestion.create({
          data: {
            featureRequestId,
            question: questions[0],
          }
        });

        await prisma.featureRequest.update({
          where: { id: featureRequestId },
          data: { status: "clarifying" },
        });
      });

      return { status: "clarifying" };
    }

    // If no clarification is needed, proceed to generate PRD
    await step.run("update-status-generating", async () => {
      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "prd_generating" },
      });
    });

    const prdContent = await step.run("generate-prd", async () => {
      const response = await generateText({
        model: openrouter("anthropic/claude-3-5-sonnet", { maxTokens: 3000 }),
        prompt: `You are a senior Product Manager. Write a concise, actionable Product Requirements Document (PRD) in Markdown for this feature:

Title: ${feature.title}
Description: ${feature.description}

User Clarifications:
${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || ""}`).join("\n")}

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

      return response.text;
    });

    await step.run("save-prd", async () => {
      await prisma.prd.upsert({
        where: { featureRequestId },
        update: { content: prdContent },
        create: { featureRequestId, content: prdContent },
      });

      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "prd_ready" },
      });
    });

    return { status: "prd_ready" };
  }
);
