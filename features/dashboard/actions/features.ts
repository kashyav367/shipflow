"use server";

import { requireAuth } from "@/features/auth/actions";
import { prisma } from "@/lib/db";
import { inngest } from "@/features/inngest/client";
import { openrouter } from "@/features/ai";
import { generateObject, generateText } from "ai";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAuditEvent } from "@/features/monitoring/lib/audit";

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
      model: openrouter("openrouter/free"),
      prompt: `You are an expert Principal Product Manager and Technical Architect.
Write a detailed, structured Product Requirements Document (PRD) in Markdown format for the following feature request:

Title: ${feature.title}
Description: ${feature.description}

Clarification Q&A context from the user:
${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || ""}`).join("\n")}

Create a concise but useful PRD with executive summary, goals, user stories, technical architecture, API considerations, edge cases, and acceptance criteria.`,
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

  const response = await generateObject({
    model: openrouter("openrouter/free"),
    schema: z.object({
      needsClarification: z.boolean(),
      questions: z.array(z.string()).describe("List of questions to clarify requirements, empty if none needed"),
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

  const questions = response.object.questions.slice(0, 1);

  if (response.object.needsClarification && questions.length > 0) {
    const createdQuestion = await prisma.clarificationQuestion.create({
      data: {
        featureRequestId,
        question: questions[0],
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
    model: openrouter("openrouter/free"),
    prompt: `You are an expert Principal Product Manager and Technical Architect.
Write a detailed, structured Product Requirements Document (PRD) in Markdown format for the following feature request:

Title: ${feature.title}
Description: ${feature.description}

Clarification Q&A context from the user:
${feature.clarifications.map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || ""}`).join("\n")}

Create a concise but useful PRD with executive summary, goals, user stories, technical architecture, API considerations, edge cases, and acceptance criteria.`,
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

export async function createFeatureRequest(formData: FormData) {
  const session = await requireAuth();
  const userId = session.user.id;

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!title || !description) {
    throw new Error("Title and description are required.");
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

  try {
    await inngest.send({
      name: "feature/planning.approved",
      data: { featureRequestId },
    });
  } catch (err) {
    console.warn("Inngest Event Error: Failed to trigger feature/planning.approved. Dev server offline.", err);
  }
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




