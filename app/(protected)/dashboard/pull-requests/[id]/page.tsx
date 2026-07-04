import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, WarningCircle, CheckCircle, Gear } from "@phosphor-icons/react/dist/ssr";

import { requireAuth } from "@/features/auth/actions";
import { getPullRequestById } from "@/features/pull-requests/server/get-pull-requests";
import { AiReviewMarkdown } from "@/features/pull-requests/components/ai-review-markdown";
import { TriggerReviewButton } from "@/features/pull-requests/components/trigger-review-button";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PullRequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PullRequestDetailPageProps) {
  const { id } = await params;
  const pr = await getPullRequestById(id);
  return {
    title: pr ? `PR #${pr.prNumber} Review · Dashboard` : "AI Review · Dashboard",
  };
}

export default async function PullRequestDetailPage({ params }: PullRequestDetailPageProps) {
  await requireAuth();
  const { id } = await params;
  
  const pr = await getPullRequestById(id);
  if (!pr) {
    notFound();
  }

  // Define status badge helper
  const getStatusDisplay = (status: string) => {
    let classes = "bg-muted text-muted-foreground border-border";
    let text = "Pending";
    let Icon = Clock;

    if (status === "reviewed") {
      classes = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      text = "Reviewed";
      Icon = CheckCircle;
    } else if (status === "processing") {
      classes = "bg-blue-500/10 text-blue-500 border-blue-500/30 animate-pulse";
      text = "Processing";
      Icon = Clock;
    } else if (status === "rate_limited") {
      classes = "bg-destructive/10 text-destructive border-destructive/30";
      text = "Rate Limited";
      Icon = WarningCircle;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${classes}`}>
        <Icon size={12} />
        <span>{text}</span>
      </span>
    );
  };

  return (
    <>
      <DashboardHeader
        title={`PR #${pr.prNumber} Review`}
        description={pr.repoFullName}
      />
      
      <div className="flex flex-1 flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
        {/* Back navigation */}
        <div>
          <Link
            href="/dashboard/pull-requests"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft size={14} />
            <span>Back to Pull Requests</span>
          </Link>
        </div>

        {/* PR Main details header card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5 min-w-0">
                <CardTitle className="text-xl font-bold text-foreground leading-snug truncate">
                  {pr.title}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  Submitted by <span className="font-semibold text-foreground">@{pr.authorLogin ?? "unknown"}</span> • Merging from <code className="bg-muted px-1.5 py-0.5 rounded text-rose-500 font-mono text-[10px]">{pr.headSha.slice(0, 7)}</code> into <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[10px]">{pr.baseBranch}</code>
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2.5 self-start sm:self-center">
                {getStatusDisplay(pr.status)}
                <TriggerReviewButton pullRequestId={pr.id} status={pr.status} />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            {/* PR Status Conditional Views */}
            {pr.status === "reviewed" ? (
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2 mb-4">
                  AI Review Feedback
                </h3>
                <AiReviewMarkdown content={pr.reviewComment || ""} />
              </div>
            ) : pr.status === "processing" ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <h4 className="text-base font-bold text-foreground">AI Review In Progress</h4>
                <p className="text-xs text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
                  Our AI agent is currently analyzing the PR files, consulting repository indexes, and generating reviews. This process usually completes in 30-60 seconds.
                </p>
              </div>
            ) : pr.status === "rate_limited" ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-destructive bg-destructive/5 rounded-lg border border-destructive/20 p-6">
                <WarningCircle size={32} className="mb-2" />
                <h4 className="text-sm font-bold">API Rate Limited</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1 leading-relaxed">
                  The review request hit API rate limits with GitHub or AI providers. Please click the "Re-run AI Review" button above to retry the analysis.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock size={36} className="text-muted-foreground/50 mb-3" />
                <h4 className="text-base font-bold text-foreground">AI Review Pending</h4>
                <p className="text-xs text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
                  This pull request is registered but does not have an active review. Click the "Run AI Review" button above to execute the agent.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
