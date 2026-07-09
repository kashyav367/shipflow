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
        model: openrouter("anthropic/claude-3-5-sonnet", { maxTokens: 1500 }),
        schema: z.object({
          tasks: z.array(z.object({
            title: z.string().describe("Short action-oriented task title (5-10 words)"),
            description: z.string().describe("Clear technical instructions for developers (2-3 sentences)"),
          })).describe("Granular technical developer tasks required to implement the PRD"),
        }),
        prompt: `Analyze this PRD and break it down into 5-8 HIGHLY GRANULAR, action-oriented engineering tasks.
        
Keep descriptions BRIEF (2-3 sentences max). Focus on implementation details.

Categories to cover:
1. Backend API routes & validation
2. Frontend UI components
3. Database / data models (if needed)
4. State management & integrations
5. Testing & edge cases

PRD:
${prd.content}`,
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
