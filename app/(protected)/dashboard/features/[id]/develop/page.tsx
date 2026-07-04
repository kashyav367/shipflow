import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { linkPullRequest } from "@/features/dashboard/actions/features";
import Link from "next/link";

interface DevelopPageProps {
  params: Promise<{ id: string }>;
}

export default async function FeatureDevelopPage({ params }: DevelopPageProps) {
  const { id } = await params;
  const feature = await prisma.featureRequest.findUnique({
    where: { id },
    include: {
      pullRequests: true,
    },
  });

  if (!feature) notFound();

  return (
    <div className="max-w-xl mx-auto mt-10 p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Connect Pull Request</h1>
        <p className="text-sm text-muted-foreground">
          Feature: <span className="font-semibold text-primary">{feature.title}</span> (Status: {feature.status})
        </p>
      </div>

      {/* Connection Form */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Link Open PR</CardTitle>
          <CardDescription>
            Enter the GitHub Repository Full Name and the Pull Request ID to link it to this feature request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              "use server";
              const repo = formData.get("repoFullName") as string;
              const pr = parseInt(formData.get("prNumber") as string);
              await linkPullRequest(id, repo, pr);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="repoFullName">GitHub Repository</Label>
              <Input
                id="repoFullName"
                name="repoFullName"
                placeholder="e.g., octocat/hello-world"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prNumber">Pull Request ID / Number</Label>
              <Input
                id="prNumber"
                name="prNumber"
                type="number"
                placeholder="e.g., 42"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Link Pull Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Linked PRs list */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Linked Pull Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {feature.pullRequests.length > 0 ? (
            <ul className="divide-y divide-border">
              {feature.pullRequests.map((pr) => (
                <li key={`${pr.repoFullName}-${pr.prNumber}`} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      PR #{pr.prNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Repository: {pr.repoFullName}
                    </p>
                  </div>
                  <Link
                    href={`https://github.com/${pr.repoFullName}/pull/${pr.prNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    View on GitHub
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground text-xs py-6">
              No Pull Requests linked yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
