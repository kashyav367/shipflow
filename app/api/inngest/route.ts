import { inngest } from "@/features/inngest/client";
import { reviewPullRequest } from "@/features/reviews/server/review-pr-function";
import { serve } from "inngest/next";
import { processTask } from "./function";
import { syncRepoCodebaseFunction } from "@/features/repo-sync/server/repo-sync-function";
import { generateFeaturePrd } from "@/features/dashboard/server/generate-prd-function";
import { generateTasksFromPrd } from "@/features/dashboard/server/generate-tasks-function";


export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTask,
    reviewPullRequest, 
    syncRepoCodebaseFunction, 
    generateFeaturePrd,
    generateTasksFromPrd
  ],
});
