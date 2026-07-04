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
    const { featureRequestId } = event.data;

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
        model: openrouter("openrouter/free"),
        schema: z.object({
          needsClarification: z.boolean(),
          questions: z.array(z.string()).describe("List of questions to clarify requirements, empty if none needed"),
        }),
        prompt: `You are an expert AI Product Manager. Analyze this feature request and determine if we have enough information to write a comprehensive, developer-ready Product Requirements Document (PRD).

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
        model: openrouter("openrouter/free"),
        prompt: `You are an expert Principal Product Manager and Technical Architect.
Write an exceptionally detailed, structured, and developer-centric Product Requirements Document (PRD) in Markdown format for the following feature request:

Title: ${feature.title}
Description: ${feature.description}

Clarification Q&A context from the user:
${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || ""}`).join("\n")}

A developer should be able to read this PRD and immediately understand exactly what to build, the architectural recommendations, database design, API endpoints, and technical considerations.

Please make the PRD comprehensive and cover the following sections in depth:

1. **Executive Summary & Goals**
   - Overview: A detailed description of the feature, target audience, and business context.
   - Core Objectives: What success looks like.
   - Out of Scope / Non-Goals: Explicitly what we are NOT building.

2. **User Stories & Workflows**
   - User Persona(s): Who will interact with this feature.
   - Detailed User Stories: Written in "As a [persona], I want to [action] so that [benefit]" format.
   - User Journey / UI Flow: A step-by-step walkthrough of how a user navigates and uses this feature.

3. **Proposed Technical Architecture**
   - Component Overview: Frontend and Backend systems/modules involved.
   - Proposed Database Schema: Detailed table designs, field names, data types, relationships, and indexes. Be specific and write code blocks of Prisma schema or SQL if applicable.
   - Proposed API Endpoints: Define REST endpoints (or GraphQL mutations/queries) with HTTP methods, paths, request headers, request bodies (JSON structures), response bodies (JSON structures), query parameters, and HTTP status codes (200, 201, 400, 401, 404, 500).
   - Core Algorithms or State Transitions (if any): Explain complex logic, step-by-step processes, or state machine transitions.

4. **Detailed Frontend UI/UX Mockup Specs**
   - Describe each component, layout, navigation, and interactive states (loading, empty, error, active).
   - Detail any micro-interactions, responsive behaviors, and input validation rules.

5. **Functional & Edge Case Requirements**
   - Detailed functional requirements with strict validation rules.
   - Edge Cases & Error Handling: Specific behaviors for slow network connections, validation failures, database errors, rate limits, concurrent access, etc.

6. **Non-Functional Requirements**
   - Performance Requirements (e.g. latency constraints).
   - Security & Compliance (authorization, authentication, data sanitization, logging).
   - Accessibility (WCAG compliance, keyboard navigation).

7. **Acceptance Criteria & Quality Assurance**
   - Write concrete, testable acceptance criteria using the Given-When-Then format where applicable.
   - A checklist of QA test cases to verify.

Ensure the document is written in a professional, clear, and structured technical tone. Use rich Markdown elements such as code blocks, lists, bullet points, headers, tables, and alerts (if helpful) to make the PRD extremely readable. DO NOT use generic summaries or placeholder text.`,
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
