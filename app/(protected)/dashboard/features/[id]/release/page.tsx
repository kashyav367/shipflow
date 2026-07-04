import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveRelease, rejectRelease } from "@/features/dashboard/actions/features";
import { CheckCircle, Warning, GitPullRequest, Clock, ShieldCheck, XCircle, RocketLaunch } from "@phosphor-icons/react/dist/ssr";

interface ReleasePageProps {
  params: Promise<{ id: string }>;
}

export default async function FeatureReleasePage({ params }: ReleasePageProps) {
  const { id } = await params;
  
  const feature = await prisma.featureRequest.findUnique({
    where: { id },
    include: {
      prd: true,
      tasks: true,
      pullRequests: true,
    },
  });

  if (!feature) notFound();

  // Find corresponding Pull Request records in the DB to read AI review remarks
  const linkedPrRecords = await prisma.pullRequest.findMany({
    where: {
      repoFullName: { in: feature.pullRequests.map(p => p.repoFullName) },
      prNumber: { in: feature.pullRequests.map(p => p.prNumber) },
    }
  });

  // Verify requirements
  const hasPrd = !!feature.prd;
  const tasksCompleted = feature.tasks.length > 0 && feature.tasks.every(t => t.status === "done");
  const hasPrLinked = feature.pullRequests.length > 0;
  const isReviewed = linkedPrRecords.length > 0 && linkedPrRecords.every(r => r.status === "reviewed");
  
  // Check if any of the reviews contain blocking issues (### 🚨 Issues)
  const hasBlockingIssues = linkedPrRecords.some(r => r.reviewComment?.includes("### 🚨 Issues"));

  const readyToShip = hasPrd && hasPrLinked && isReviewed && !hasBlockingIssues;

  // Let's compute a readiness percent score
  let checklistPassedCount = 0;
  if (hasPrd) checklistPassedCount++;
  if (hasPrLinked) checklistPassedCount++;
  if (isReviewed && !hasBlockingIssues) checklistPassedCount++;
  const readinessPercent = Math.round((checklistPassedCount / 3) * 100);

  return (
    <div className="max-w-4xl mx-auto mt-6 p-4 space-y-6">
      {/* Top Release Status Card */}
      <Card className="border border-border bg-card shadow-md">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">Release Readiness Deck</h2>
            <p className="text-xs text-muted-foreground">
              Review pre-release checks for feature: <span className="font-semibold text-primary">{feature.title}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Readiness Score</span>
              <span className="text-lg font-extrabold text-foreground">{readinessPercent}%</span>
            </div>
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden border border-border">
              <div 
                className={`h-full transition-all duration-500 ${readyToShip ? "bg-emerald-500" : "bg-primary"}`} 
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Approval Split Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Dynamic Pre-Release Checklist */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
            System Checklists
          </h3>

          {/* PRD Checklist Item Card */}
          <Card className={`border shadow-sm transition-all ${
            hasPrd 
              ? "border-emerald-500/20 bg-emerald-500/[0.02]" 
              : "border-border bg-card"
          }`}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`p-2 rounded-lg shrink-0 ${
                hasPrd 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {hasPrd ? <ShieldCheck size={20} /> : <Clock size={20} />}
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-foreground">Product Requirements Document (PRD)</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {hasPrd 
                    ? "Passed: PRD document has been successfully drafted and verified." 
                    : "Pending: AI requirements clarification chat must be completed."}
                </p>
                {hasPrd && (
                  <Link href={`/dashboard/features/${id}/prd`} className="text-[10px] text-primary hover:underline font-bold block pt-1">
                    View PRD Document &rarr;
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Linked Pull Request Card */}
          <Card className={`border shadow-sm transition-all ${
            hasPrLinked 
              ? "border-emerald-500/20 bg-emerald-500/[0.02]" 
              : "border-border bg-card"
          }`}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`p-2 rounded-lg shrink-0 ${
                hasPrLinked 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "bg-muted text-muted-foreground"
              }`}>
                <GitPullRequest size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-foreground">Linked Pull Request</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {hasPrLinked 
                    ? `Passed: Linked ${feature.pullRequests.length} active developer branch PR(s).` 
                    : "Pending: Link an active pull request under the 'GitHub Develop' tab."}
                </p>
                {hasPrLinked && (
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {feature.pullRequests.map(pr => (
                      <Link 
                        key={pr.prNumber}
                        href={`https://github.com/${pr.repoFullName}/pull/${pr.prNumber}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded border border-border text-[9px] font-semibold text-foreground hover:text-primary"
                      >
                        <span>{pr.repoFullName} #{pr.prNumber}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Quality Checklist Card */}
          <Card className={`border shadow-sm transition-all ${
            isReviewed && !hasBlockingIssues
              ? "border-emerald-500/20 bg-emerald-500/[0.02]"
              : hasBlockingIssues 
              ? "border-destructive/20 bg-destructive/[0.02]" 
              : "border-border bg-card"
          }`}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`p-2 rounded-lg shrink-0 ${
                isReviewed && !hasBlockingIssues
                  ? "bg-emerald-500/10 text-emerald-500"
                  : hasBlockingIssues
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isReviewed && !hasBlockingIssues ? (
                  <CheckCircle size={20} />
                ) : hasBlockingIssues ? (
                  <Warning size={20} />
                ) : (
                  <Clock size={20} />
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-foreground">AI Quality & PRD Review</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isReviewed 
                    ? (hasBlockingIssues 
                        ? "🚨 Review Completed: Blocking issues or discrepancies found in implementation." 
                        : "✅ Review Completed: Code changes comply with the approved PRD requirements.")
                    : "Pending: Awaiting code synchronization and automatic GitHub PR review checks."}
                </p>
                {linkedPrRecords.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {linkedPrRecords.map(pr => (
                      <Link 
                        key={pr.id}
                        href={`/dashboard/pull-requests/${pr.id}`}
                        className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded border border-border text-[9px] font-semibold text-primary hover:underline"
                      >
                        <span>View PR #{pr.prNumber} AI Review</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Side: Ship Actions */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Approvals
          </h3>

          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Release Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feature.status === "shipped" ? (
                <div className="text-center py-6 border border-dashed rounded-lg bg-emerald-500/[0.02] border-emerald-500/20">
                  <CheckCircle className="size-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-sm text-foreground">Feature Shipped!</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Closed and deployed to production.</p>
                </div>
              ) : (
                <>
                  {/* Approve Release Action Form */}
                  <form
                    action={async () => {
                      "use server";
                      await approveRelease(id);
                    }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-10 gap-1.5 text-xs font-bold" 
                      disabled={!readyToShip} 
                      variant="default"
                    >
                      <RocketLaunch size={16} />
                      <span>Approve & Ship Release</span>
                    </Button>
                  </form>

                  {/* Reject / Send Back Form */}
                  <form
                    action={async (formData) => {
                      "use server";
                      const feedback = formData.get("feedback") as string;
                      await rejectRelease(id, feedback);
                    }}
                    className="space-y-3 border-t border-border pt-4"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="feedback" className="text-xs font-semibold text-foreground">
                        Request Fixes / Feedback
                      </Label>
                      <Textarea
                        id="feedback"
                        name="feedback"
                        placeholder="Detail any blocking changes required by developers..."
                        rows={4}
                        required
                        className="text-xs border-border bg-background"
                      />
                    </div>
                    <Button type="submit" className="w-full text-xs" variant="destructive">
                      Reject & Send Back
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
