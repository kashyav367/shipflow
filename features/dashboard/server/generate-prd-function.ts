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

      const rawResponse = await generateText({
        model: openrouter("anthropic/claude-sonnet-4", { maxTokens: 600 }),
        prompt: `You are an expert AI Product Manager. Analyze this feature request and determine if we have enough information to write a clear, actionable Product Requirements Document (PRD).

        Title: ${feature.title}
        Description: ${feature.description}

        Clarification Q&A History:
        ${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || "No response yet"}`).join("\n\n") || "(none yet)"}

        Guidelines:
        1. If this is the initial request and it is very brief, ask exactly 1 specific, high-impact question.
        2. If the user answered previous questions, only ask a follow-up if there is a critical technical ambiguity.
        3. Keep it turn-by-turn. ONLY ask at most 1 question.

        Respond with ONLY a raw JSON object (no markdown, no backticks):
        {"needsClarification": true/false, "question": "your single question or empty string"}`
      });

      // Parse JSON manually (Claude sometimes wraps in markdown)
      let needsClarification = false;
      let questionText = "";
      try {
        const cleaned = rawResponse.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        needsClarification = parsed.needsClarification === true;
        questionText = parsed.question || "";
      } catch {
        needsClarification = true;
        questionText = "Could you provide more details about the key features, target users, and technical constraints?";
      }

      return { needsClarification, questions: questionText ? [questionText] : [] };
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
        model: openrouter("anthropic/claude-sonnet-4", { maxTokens: 600 }),
        prompt: `Write a SHORT Product Requirements Document for this feature. Be brief and direct.

Title: ${feature.title}
Description: ${feature.description}
Clarifications: ${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question} A: ${c.answer || "N/A"}`).join(" | ")}

Respond in Markdown with ONLY these 3 sections (max 150 words total):

## Summary
1-2 sentences: what we're building and why.

## Key Requirements
4-6 bullet points of what it must do.

## Acceptance Criteria
4-6 checkboxes of done conditions.

Do NOT add extra sections, stories, or technical details.`,
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
