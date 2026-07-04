import { prisma } from "@/lib/db";
import { getInstallationReposPage } from "@/features/github/server/repos";

export async function getRepoSummary(installationId: number) {
  try {
    const { totalCount } = await getInstallationReposPage(installationId, 1);

    const syncedCount = await prisma.repoSync.count({
      where: {
        installationId,
        status: "synced",
      },
    });

    const syncingCount = await prisma.repoSync.count({
      where: {
        installationId,
        status: "syncing",
      },
    });

    const failedCount = await prisma.repoSync.count({
      where: {
        installationId,
        status: "failed",
      },
    });

    return {
      totalCount,
      syncedCount,
      syncingCount,
      failedCount,
    };
  } catch (error) {
    console.error("Error fetching repository summary:", error);
    return {
      totalCount: 0,
      syncedCount: 0,
      syncingCount: 0,
      failedCount: 0,
    };
  }
}
