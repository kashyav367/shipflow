import type { Metadata } from "next";
import Link from "next/link";

import { requireAuth } from "@/features/auth/actions";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { getInstallationStatus } from "@/features/github/server/installation";
import { getPullRequests } from "@/features/pull-requests/server/get-pull-requests";
import { PullRequestsList } from "@/features/pull-requests/components/pull-requests-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pull Requests · Dashboard",
};

function PRsNotConnected() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 min-h-[50vh] max-w-md mx-auto text-center">
      <p className="text-sm text-muted-foreground">
        Install the GitHub App first to track and review pull requests.
      </p>
      <Button nativeButton={false} render={<Link href={DASHBOARD_ROUTES.github} />}>
        Go to GitHub App
      </Button>
    </div>
  );
}

/**
 * Pull request list page with GitHub app integration guard.
 */
export default async function DashboardPullRequestsPage() {
  const session = await requireAuth();
  const installation = await getInstallationStatus(session.user.id);

  const header = (
    <DashboardHeader
      title="Pull Requests"
      description="Track code review history, statuses, and automated AI reviews."
    />
  );

  if (!installation.connected) {
    return (
      <>
        {header}
        <PRsNotConnected />
      </>
    );
  }

  const pullRequests = await getPullRequests(session.user.id);

  return (
    <>
      {header}
      <PullRequestsList pullRequests={pullRequests} />
    </>
  );
}
