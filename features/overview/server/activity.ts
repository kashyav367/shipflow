import { prisma } from "@/lib/db";

export type ActivityItem = {
  id: string;
  type: "feature_created" | "feature_updated" | "repo_synced" | "repo_syncing" | "repo_failed" | "repo_pending";
  title: string;
  description: string;
  timestamp: Date;
  link?: string;
};

export async function getRecentActivity(installationId: number): Promise<ActivityItem[]> {
  try {
    const recentSyncs = await prisma.repoSync.findMany({
      where: { installationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    const recentFeatures = await prisma.featureRequest.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const activities: ActivityItem[] = [];

    for (const feat of recentFeatures) {
      activities.push({
        id: `feat-${feat.id}-${feat.updatedAt.getTime()}`,
        type: feat.status === "shipped" ? "repo_synced" : "feature_updated",
        title: `Feature: ${feat.title}`,
        description: `Status updated to: ${feat.status.replace("_", " ").toUpperCase()}`,
        timestamp: feat.updatedAt,
        link: `/dashboard/features/${feat.id}/prd`,
      });
    }

    for (const sync of recentSyncs) {
      let type: ActivityItem["type"] = "repo_pending";
      if (sync.status === "synced") type = "repo_synced";
      else if (sync.status === "syncing") type = "repo_syncing";
      else if (sync.status === "failed") type = "repo_failed";

      activities.push({
        id: `sync-${sync.id}`,
        type,
        title: `Repo Sync: ${sync.repoFullName}`,
        description: `Branch: ${sync.branch} • Status: ${sync.status}`,
        timestamp: sync.updatedAt,
        link: `/dashboard/repos`,
      });
    }

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
}
