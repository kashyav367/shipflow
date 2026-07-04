import { prisma } from "@/lib/db";
import { getInstallationStatus, getUserInstallationId } from "@/features/github/server/installation";
import { getRepoSummary } from "./repo-summary";
import { getRecentActivity } from "./activity";

/**
 * Gets the user's existing workspace, or automatically creates one if it doesn't exist.
 */
async function getOrCreateUserWorkspace(userId: string) {
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

export async function getOverviewData(userId: string) {
  try {
    const installation = await getInstallationStatus(userId);
    const installationId = await getUserInstallationId(userId);

    // Auto-create workspace if it doesn't exist yet
    const workspace = await getOrCreateUserWorkspace(userId);

    let features: any[] = [];
    let featureMetrics = {
      total: 0,
      active: 0,
      shipped: 0,
      awaitingApproval: 0,
    };

    if (workspace) {
      features = await prisma.featureRequest.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
      });

      const allFeatures = await prisma.featureRequest.findMany({
        where: { workspaceId: workspace.id },
      });

      featureMetrics = {
        total: allFeatures.length,
        active: allFeatures.filter(f => f.status !== "shipped" && f.status !== "draft").length,
        shipped: allFeatures.filter(f => f.status === "shipped").length,
        awaitingApproval: allFeatures.filter(f => f.status === "ready_to_ship" || f.status === "review").length,
      };
    }

    if (!installation.connected || !installationId) {
      return {
        connected: false,
        accountLogin: null,
        installedAt: null,
        repoSummary: null,
        recentActivity: [],
        features,
        featureMetrics,
      };
    }

    const [repoSummary, recentActivity] = await Promise.all([
      getRepoSummary(installationId),
      getRecentActivity(installationId),
    ]);

    return {
      connected: true,
      accountLogin: installation.accountLogin,
      installedAt: installation.installedAt,
      repoSummary,
      recentActivity,
      features,
      featureMetrics,
    };
  } catch (error) {
    console.error("Error generating overview data:", error);
    return {
      connected: false,
      accountLogin: null,
      installedAt: null,
      repoSummary: null,
      recentActivity: [],
      features: [],
      featureMetrics: { total: 0, active: 0, shipped: 0, awaitingApproval: 0 },
    };
  }
}
