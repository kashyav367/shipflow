import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { approvePrd } from "@/features/dashboard/actions/features";
import { AiReviewMarkdown } from "@/features/pull-requests/components/ai-review-markdown";
import { PrdStatusPoller } from "@/features/dashboard/components/prd-status-poller";

interface PrdPageProps {
  params: Promise<{ id: string }>;
}

export default async function FeaturePrdPage({ params }: PrdPageProps) {
  const { id } = await params;
  
  const feature = await prisma.featureRequest.findUnique({
    where: { id },
    include: { prd: true },
  });

  if (!feature) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto mt-6 p-4">
      <Card className="border border-border bg-card shadow-md">
        <CardHeader className="border-b pb-4 mb-4">
          <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Status: <span className="font-semibold uppercase text-primary">{feature.status.replace("_", " ")}</span>
          </p>
        </CardHeader>
        <CardContent>
          {feature.status === "prd_generating" ? (
            <div className="text-center text-muted-foreground py-16 flex flex-col items-center justify-center gap-3">
              <div className="size-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="space-y-1">
                <p className="font-bold text-foreground">Drafting PRD...</p>
                <p className="text-xs text-muted-foreground">AI is currently compiling requirements. Page will update shortly.</p>
                <PrdStatusPoller featureId={id} />
              </div>
            </div>
          ) : feature.prd ? (
            <div className="space-y-6">
              {/* Rich parsed detailed PRD rendering */}
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <AiReviewMarkdown content={feature.prd.content} />
              </div>
              
              {feature.status === "prd_ready" && (
                <form
                  action={async () => {
                    "use server";
                    await approvePrd(id);
                  }}
                  className="border-t border-border pt-4 flex justify-end"
                >
                  <Button type="submit" size="lg" className="w-full sm:w-auto">
                    Approve PRD & Generate Tasks
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <p className="font-bold text-foreground">No PRD Generated</p>
              <p className="text-xs text-muted-foreground">Complete the Requirement Clarification Chat to trigger generation.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
