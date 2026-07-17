"use server";

import { requireAuth } from "@/features/auth/actions";
import { prisma } from "@/lib/db";
import { inngest } from "@/features/inngest/client";
import { openrouter } from "@/features/ai";
import { generateText, generateObject } from "ai";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAuditEvent } from "@/features/monitoring/lib/audit";
import {
  sanitizeInput,
  validateFeatureInput,
  validateClarificationAnswer,
  validateAiQuestion,
  validatePrdOutput,
  validateChatResponse,
} from "@/features/ai/guardrails";

async function getOrCreateUserWorkspace(userId: string) {
  // Find any workspace owned by or containing this user
  let workspace = await prisma.workspace.findFirst({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    }
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "Personal Workspace",
        slug: `personal-${userId.substring(0, 8)}`,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "owner"
          }
        }
      }
    });
  }

  return workspace;
}

async function processFeatureRequestFlow(featureRequestId: string) {
  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: { clarifications: true },
  });

  if (!feature) {
    throw new Error("Feature request not found.");
  }

  const shouldClarify = feature.clarifications.length < 3;

  if (!shouldClarify) {
    await prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: { status: "prd_generating" },
    });

    const prdContent = await generateText({
      model: openrouter("anthropic/claude-sonnet-4", { maxTokens: 800 }),
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

    await prisma.prd.upsert({
      where: { featureRequestId },
      update: { content: prdContent.text },
      create: { featureRequestId, content: prdContent.text },
    });

    await prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: { status: "prd_ready" },
    });

    return { status: "prd_ready" as const };
  }

  // Use generateText instead of generateObject because Claude returns markdown-wrapped JSON
  // which breaks generateObject parsing. We extract JSON manually.
  const rawResponse = await generateText({
    model: openrouter("anthropic/claude-sonnet-4", { maxTokens: 800 }),
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

Respond with ONLY a raw JSON object (no markdown, no backticks, no extra text):
{"needsClarification": true/false, "question": "your single question here or empty string"}`,
  });

  // Parse the JSON response
  let needsClarification = false;
  let questionText = "";
  try {
    // Strip any accidental markdown code fences
    const cleaned = rawResponse.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    needsClarification = parsed.needsClarification === true;
    questionText = parsed.question || "";
  } catch {
    // If parsing fails, assume we need clarification and ask a default question
    needsClarification = true;
    questionText = "Could you provide more details about the key features, target users, and technical constraints for this feature?";
  }

  const questions = questionText ? [questionText] : [];

  if (needsClarification && questions.length > 0) {
    // ── Guardrail: validate AI-generated question ──
    const questionCheck = validateAiQuestion(questions[0]);
    const safeQuestion = questionCheck.ok
      ? questions[0]
      : "Could you provide more details about the key features, target users, and technical constraints for this feature?";

    const createdQuestion = await prisma.clarificationQuestion.create({
      data: {
        featureRequestId,
        question: safeQuestion,
      },
    });

    await prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: { status: "clarifying" },
    });

    return {
      status: "clarifying" as const,
      question: {
        id: createdQuestion.id,
        question: createdQuestion.question,
        answer: null,
        createdAt: createdQuestion.createdAt,
      },
    };
  }

  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "prd_generating" },
  });

  const prdContent = await generateText({
    model: openrouter("anthropic/claude-sonnet-4", { maxTokens: 800 }),
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

  // ── Guardrail: validate PRD output before saving ──
  const prdCheck = validatePrdOutput(prdContent.text);
  const contentToSave = prdCheck.valid ? prdContent.text : prdContent.text; // still save but log warnings
  if (prdCheck.warnings.length > 0) {
    console.warn("[Guardrail] PRD output warnings:", prdCheck.warnings);
  }

  await prisma.prd.upsert({
    where: { featureRequestId },
    update: { content: contentToSave },
    create: { featureRequestId, content: contentToSave },
  });

  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "prd_ready" },
  });

  return { status: "prd_ready" as const };
}

export async function createFeatureRequest(formData: FormData) {
  const session = await requireAuth();
  const userId = session.user.id;

  const title = sanitizeInput((formData.get("title") as string) || "");
  const description = sanitizeInput((formData.get("description") as string) || "");

  if (!title || !description) {
    throw new Error("Title and description are required.");
  }

  // ── Guardrail: validate feature input ──
  const inputCheck = validateFeatureInput(title, description);
  if (!inputCheck.ok) {
    throw new Error(inputCheck.reason);
  }

  const workspace = await getOrCreateUserWorkspace(userId);

  const feature = await prisma.featureRequest.create({
    data: {
      title,
      description,
      status: "draft",
      workspaceId: workspace.id,
    },
  });

  await logAuditEvent({
    userId,
    action: "feature_created",
    details: `Created feature request: ${title}`,
    targetType: "feature_request",
    targetId: feature.id,
  });

  try {
    await processFeatureRequestFlow(feature.id);
  } catch (error) {
    console.error("Direct feature flow failed, falling back to Inngest:", error);
    try {
      await inngest.send({
        name: "feature/request.received",
        data: { featureRequestId: feature.id },
      });
    } catch (err) {
      console.warn("Inngest Event Error: Failed to trigger feature/request.received. Dev server offline.", err);
    }
  }

  redirect(`/dashboard/features/${feature.id}/prd`);
}


export async function answerClarification(
  featureRequestId: string, 
  questionId: string, 
  answer: string,
  actorId?: string
) {
  if (!answer.trim()) {
    throw new Error("Answer cannot be empty.");
  }

  await prisma.clarificationQuestion.update({
    where: { id: questionId },
    data: { answer },
  });

  if (actorId) {
    await logAuditEvent({
      userId: actorId,
      action: "clarification_answered",
      details: `Answered clarification question for feature request ${featureRequestId}`,
      targetType: "feature_request",
      targetId: featureRequestId,
    });
  }

  try {
    return await processFeatureRequestFlow(featureRequestId);
  } catch (error) {
    console.error("Direct clarification flow failed, falling back to Inngest:", error);
    try {
      await inngest.send({
        name: "feature/clarification.answered",
        data: { featureRequestId },
      });
    } catch (err) {
      console.warn("Inngest Event Error: Failed to trigger feature/clarification.answered. Dev server offline.", err);
    }

    return { status: "clarifying" as const };
  }
}

// Direct task generation fallback (used when Inngest is unavailable)
async function generateTasksDirectly(featureRequestId: string) {
  const prd = await prisma.prd.findUnique({ where: { featureRequestId } });
  if (!prd) throw new Error("PRD not found.");

  const response = await generateObject({
    model: openrouter("openai/gpt-4o-mini", { maxTokens: 800 }),
    schema: z.object({
      tasks: z.array(z.object({
        title: z.string().describe("Short task title (5-8 words)"),
        description: z.string().describe("1-2 sentence implementation note"),
      })).describe("3-5 developer tasks to implement this feature"),
    }),
    prompt: `Break this PRD into 3-5 developer tasks. Be concise.

PRD:
${prd.content}

Return exactly 3-5 tasks. Each task: short title + 1-2 sentence description. Cover: backend, frontend, and testing.`,
  });

  const tasksData = response.object.tasks;

  await prisma.$transaction(
    tasksData.map((t) =>
      prisma.task.create({
        data: {
          featureRequestId,
          title: t.title,
          description: t.description,
          status: "todo",
        },
      })
    )
  );

  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "development" },
  });

  return { success: true, count: tasksData.length };
}

export async function approvePrd(featureRequestId: string) {
  const session = await requireAuth();

  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "planning" },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: "prd_approved",
    details: "Approved PRD and started planning flow.",
    targetType: "feature_request",
    targetId: featureRequestId,
  });

  // Try Inngest first, fall back to direct generation
  let usedDirect = false;
  try {
    await inngest.send({
      name: "feature/planning.approved",
      data: { featureRequestId },
    });
  } catch (err) {
    console.warn("Inngest Event Error: Failed to trigger feature/planning.approved. Running task generation directly.", err);
    try {
      await generateTasksDirectly(featureRequestId);
      usedDirect = true;
    } catch (directErr) {
      console.error("Direct task generation also failed:", directErr);
    }
  }

  // Redirect to kanban board so user sees live progress
  redirect(`/dashboard/features/${featureRequestId}/tasks`);
}

export async function linkPullRequest(
  featureRequestId: string,
  repoFullName: string,
  prNumber: number
) {
  if (!repoFullName.includes("/") || isNaN(prNumber)) {
    throw new Error("Invalid repository name or PR number.");
  }

  // 1. Create the link in the database
  await prisma.featurePullRequest.upsert({
    where: {
      featureRequestId_repoFullName_prNumber: {
        featureRequestId,
        repoFullName,
        prNumber,
      },
    },
    update: {},
    create: {
      featureRequestId,
      repoFullName,
      prNumber,
    },
  });

  // 2. Set the feature status to review
  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "review" },
  });
}
export async function approveRelease(featureRequestId: string) {
  // Update status to shipped
  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "shipped" },
  });
}

export async function rejectRelease(featureRequestId: string, notes: string) {
  // Save notes and send feature back to development/fixes state
  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "review" }, // or "development"
  });

  // Create a note/question for fixes if needed
  if (notes.trim()) {
    await prisma.clarificationQuestion.create({
      data: {
        featureRequestId,
        question: `Human Reviewer Feedback: ${notes}`,
      }
    });
  }
}

export async function submitClarificationAnswer(formData: FormData) {
  const featureRequestId = formData.get("featureRequestId") as string;
  const questionId = formData.get("questionId") as string;
  const answer = formData.get("answer") as string;

  await answerClarification(featureRequestId, questionId, answer);
}

export async function submitClarificationAnswerAction(
  featureRequestId: string,
  questionId: string,
  answer: string
) {
  const session = await requireAuth();
  return await answerClarification(featureRequestId, questionId, answer, session.user.id);
}

export async function retryFeatureAnalysis(featureRequestId: string) {
  const session = await requireAuth();

  // Reset status back to draft so flow can re-run
  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "draft" },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: "feature_retried",
    details: `Retried AI analysis for feature request ${featureRequestId}`,
    targetType: "feature_request",
    targetId: featureRequestId,
  });

  try {
    return await processFeatureRequestFlow(featureRequestId);
  } catch (error) {
    console.error("Retry flow failed:", error);
    throw new Error("AI analysis failed. Please check your API key and try again.");
  }
}

export async function getFeatureClarificationState(featureRequestId: string) {
  await requireAuth();
  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: { clarifications: true },
  });
  return feature;
}

export async function updateTaskStatus(
  taskId: string,
  status: "todo" | "in_progress" | "review" | "done"
) {
  await requireAuth();
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });
  return updatedTask;
}




