"use server";

import { requireAuth } from "@/features/auth/actions";
import { prisma } from "@/lib/db";
import { generateText } from "ai";
import { openrouter } from "@/features/ai";

export async function sendChatMessage(
  featureRequestId: string,
  userMessage: string
) {
  const session = await requireAuth();
  if (!session) throw new Error("Unauthorized");

  // Verify user has access to this feature
  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: { 
      workspace: true,
      clarifications: true,
      prd: true,
      chatMessages: {
        take: 10,
        orderBy: { createdAt: "desc" },
      }
    },
  });

  if (!feature) throw new Error("Feature not found");

  // Check workspace access
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: feature.workspaceId,
      userId: session.user.id,
    },
  });

  if (!member && feature.workspace.ownerId !== session.user.id) {
    throw new Error("Access denied");
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      featureRequestId,
      role: "user",
      content: userMessage,
    },
  });

  // Build context from feature and chat history
  const clarificationContext = feature.clarifications
    .map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer || "Pending"}`)
    .join("\n\n");

  const prdContext = feature.prd ? `\n\nCurrent PRD:\n${feature.prd.content}` : "";

  const chatHistory = feature.chatMessages
    .reverse()
    .slice(0, 5)
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n\n");

  // Generate AI response
  const aiResult = await generateText({
    model: openrouter("anthropic/claude-3-5-sonnet", { maxTokens: 2000 }),
    prompt: `You are ShipFlow AI, a helpful Product Requirements assistant. You help users refine feature requests and create better PRDs.

Feature Request:
Title: ${feature.title}
Description: ${feature.description}

Clarification Q&A:
${clarificationContext}${prdContext}

Recent Chat History:
${chatHistory}

User's latest message: ${userMessage}

Respond helpfully to the user's message. Be concise, actionable, and focus on improving the feature requirements. If they ask about the PRD, provide specific suggestions. If they ask questions, answer based on the feature context.`,
  });

  const aiResponse = aiResult.text;

  // Save AI response
  const savedMessage = await prisma.chatMessage.create({
    data: {
      featureRequestId,
      role: "assistant",
      content: aiResponse,
    },
  });

  return {
    userMessage,
    assistantMessage: aiResponse,
    savedMessageId: savedMessage.id,
  };
}

export async function getChatMessages(featureRequestId: string) {
  const session = await requireAuth();
  if (!session) throw new Error("Unauthorized");

  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: { workspace: true },
  });

  if (!feature) throw new Error("Feature not found");

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: feature.workspaceId,
      userId: session.user.id,
    },
  });

  if (!member && feature.workspace.ownerId !== session.user.id) {
    throw new Error("Access denied");
  }

  return prisma.chatMessage.findMany({
    where: { featureRequestId },
    orderBy: { createdAt: "asc" },
  });
}
