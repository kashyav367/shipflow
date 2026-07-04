import { prisma } from "@/lib/db";
import { getUserInstallationId } from "@/features/github/server/installation";

/**
 * Fetches all pull requests associated with a user's GitHub installation.
 */
export async function getPullRequests(userId: string) {
  try {
    const installationId = await getUserInstallationId(userId);
    if (!installationId) {
      return [];
    }

    return await prisma.pullRequest.findMany({
      where: { installationId },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching pull requests:", error);
    return [];
  }
}

/**
 * Fetches a single pull request by database ID.
 */
export async function getPullRequestById(id: string) {
  try {
    return await prisma.pullRequest.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Error fetching pull request by id:", error);
    return null;
  }
}
