"use server";

import { prisma } from "@/lib/db";
import { inngest } from "@/features/inngest/client";
import { revalidatePath } from "next/cache";

/**
 * Server Action to manually trigger or retry an AI code review for a pull request.
 */
export async function triggerPullRequestReviewAction(pullRequestId: string) {
  try {
    // 1. Mark status as pending so UI displays progress
    await prisma.pullRequest.update({
      where: { id: pullRequestId },
      data: { status: "pending" },
    });

    // 2. Dispatch event to Inngest engine
    await inngest.send({
      name: "github/pr.received",
      data: {
        pullRequestId,
      },
    });

    // 3. Revalidate cache
    revalidatePath(`/dashboard/pull-requests/${pullRequestId}`);
    revalidatePath("/dashboard/pull-requests");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to trigger pull request review:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
