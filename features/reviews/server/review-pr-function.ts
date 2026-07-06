import { inngest } from "@/features/inngest/client";
import { prisma } from "@/lib/db";
import { formatPrFilesForReview, getPullRequestFiles } from "./pr-files";
import { generateReview } from "./generate-review";
import { postPrComment } from "./post-pr-comment";
import { chunkPrFiles } from "../utils/chunk-code";
import { buildPrNamespace, saveChunksToPinecone, searchPrContext } from "./vector";
import { buildRepoNamespace } from "@/features/repo-sync/server/repo-sync";

export const reviewPullRequest = inngest.createFunction(
  { id: "review-pull-request", triggers: { event: "github/pr.received" } },
  async ({ event, step }) => {
    const pullRequestId = event.data.pullRequestId;

    if (!pullRequestId) {
      throw new Error("Missing 'pullRequestId' in event data payload.");
    }

    const pullRequest = await step.run("mark-processing", async () => {
      return prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: { status: "processing" },
      });
    });

    // 1. Check if this PR is linked to a Feature Request and load the PRD
    const featureLink = await step.run("get-linked-feature", async () => {
      return prisma.featurePullRequest.findFirst({
        where: {
          repoFullName: pullRequest.repoFullName,
          prNumber: pullRequest.prNumber,
        },
        include: {
          featureRequest: {
            include: { prd: true }
          }
        }
      });
    });

    const chunks = await step.run("breakdown-code", async () => {
      const files = await getPullRequestFiles(
        pullRequest.installationId,
        pullRequest.repoFullName,
        pullRequest.prNumber
      );
      return chunkPrFiles(pullRequest.prNumber, files);
    });

    if (chunks.length === 0) {
      await step.run("mark-reviewed-no-code", async () => {
        await prisma.pullRequest.update({
          where: { id: pullRequestId },
          data: { status: "reviewed" },
        });
      });
      return { pullRequestId, status: "reviewed", reason: "no code to review" };
    }

    const namespace = buildPrNamespace(
      pullRequest.repoFullName,
      pullRequest.prNumber
    );

    await step.run("save-vectors-to-pinecone", async () => {
      await saveChunksToPinecone(namespace, chunks);
    });

    await step.sleep("wait-for-vectors-to-index", "10s");

    const repoContextSnippets = await step.run("search-repo-context", async () => {
      const repoSync = await prisma.repoSync.findUnique({
        where: { repoFullName: pullRequest.repoFullName },
      });

      if (!repoSync || repoSync.status !== "synced") {
        return [];
      }

      const repoNamespace = buildRepoNamespace(pullRequest.repoFullName);
      return searchPrContext(repoNamespace, pullRequest.title);
    });

    // 2. Generate PRD-aware review
    const review = await step.run("generate-ai-review", async () => {
      const contextSnippets = await searchPrContext(
        namespace,
        pullRequest.title
      );

      return generateReview({
        repoFullName: pullRequest.repoFullName,
        title: pullRequest.title,
        contextSnippets,
        repoContextSnippets,
        prdContent: featureLink?.featureRequest?.prd?.content, // <-- Pass PRD content here
      });
    });

    await step.run("post-pr-comment", async () => {
      await postPrComment(
        pullRequest.installationId,
        pullRequest.repoFullName,
        pullRequest.prNumber,
        review
      );
    });

    await step.run("mark-reviewed", async () => {
      await prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: {
          status: "reviewed",
          reviewComment: review,
          reviewedAt: new Date(),
        },
      });
    });

    // 3. Update Feature Request status based on blocking issues
    if (featureLink) {
      await step.run("update-feature-status", async () => {
        const hasBlockingIssues = review.includes("### 🚨 Issues") && review.split("### 🚨 Issues")[1].trim().length > 0;
        
        await prisma.featureRequest.update({
          where: { id: featureLink.featureRequestId },
          data: {
            status: hasBlockingIssues ? "review" : "ready_to_ship" // If clean, mark ready to ship!
          }
        });
      });
    }

    return { pullRequestId, status: "reviewed" };
  }
);
