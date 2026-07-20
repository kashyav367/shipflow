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
    const featureRequestId = event.data?.featureRequestId || event.data;

    if (!featureRequestId) {
      console.error("Event data structure:", event.data);
      throw new Error("Missing 'featureRequestId' in event data payload.");
    }

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
        model: openrouter("openai/gpt-4o-mini", { maxTokens: 600 }),
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
