import { inngest } from "@/features/inngest/client";
import { prisma } from "@/lib/db";
import { generateObject } from "ai";
import { openrouter } from "@/features/ai";
import { z } from "zod";

export const generateTasksFromPrd = inngest.createFunction(
  { 
    id: "generate-tasks-from-prd", 
    triggers: { event: "feature/planning.approved" } 
  },
  async ({ event, step }) => {
    const { featureRequestId } = event.data;

    // 1. Get the PRD content
    const prd = await step.run("get-prd", async () => {
      return prisma.prd.findUnique({
        where: { featureRequestId },
      });
    });

    if (!prd) throw new Error("PRD not found.");

    // 2. Call AI to generate structured task objects
    const tasksData = await step.run("generate-tasks-with-ai", async () => {
      const response = await generateObject({
        model: openrouter("google/gemini-2.5-flash", { maxTokens: 2000 }),
        schema: z.object({
          tasks: z.array(z.object({
            title: z.string().describe("Short action-oriented task title"),
            description: z.string().describe("Clear technical instructions for developers"),
          })).describe("Granular technical developer tasks required to implement the PRD"),
        }),
        prompt: `Analyze this Product Requirements Document (PRD) and break it down into highly granular, action-oriented engineering tasks for developers. 
        Each task should have a clear title and a description containing technical instructions, step-by-step checklists, or files to modify where applicable.
        Make sure to create separate tasks for:
        1. Database migrations / schema updates (if any).
        2. Backend API route implementation & validation (if any).
        3. Frontend UI components & layout.
        4. State management, integrations, & business logic.
        5. Unit/Integration tests and edge-case verification.

        PRD Content:
        ${prd.content}`
      });

      return response.object.tasks;
    });

    // 3. Save tasks in database and set status to development
    await step.run("save-tasks-to-db", async () => {
      await prisma.$transaction(
        tasksData.map(t =>
          prisma.task.create({
            data: {
              featureRequestId,
              title: t.title,
              description: t.description,
              status: "todo",
            }
          })
        )
      );

      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "development" },
      });
    });

    return { success: true, count: tasksData.length };
  }
);
