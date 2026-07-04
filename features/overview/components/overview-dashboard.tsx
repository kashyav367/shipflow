"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  GithubLogo, 
  Folder, 
  GitPullRequest, 
  CheckCircle, 
  ArrowRight,
  Clock,
  XCircle,
  WarningCircle,
  Gear,
  Sparkle,
  Plus,
  RocketLaunch
} from "@phosphor-icons/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { ActivityItem } from "../server/activity";

interface FeatureRequestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  updatedAt: string | Date;
}

interface OverviewDashboardProps {
  overview: {
    connected: boolean;
    accountLogin: string | null;
    installedAt: string | null;
    repoSummary: {
      totalCount: number;
      syncedCount: number;
      syncingCount: number;
      failedCount: number;
    } | null;
    recentActivity: ActivityItem[];
    features: FeatureRequestItem[];
    featureMetrics: {
      total: number;
      active: number;
      shipped: number;
      awaitingApproval: number;
    };
  };
}

export function OverviewDashboard({ overview }: OverviewDashboardProps) {
  if (!overview.connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 min-h-[60vh] max-w-xl mx-auto text-center">
        <div className="rounded-full bg-muted p-4 text-muted-foreground">
          <GithubLogo size={48} className="animate-pulse text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Connect GitHub App</h2>
          <p className="text-sm text-muted-foreground">
            To view repository sync statuses, pull requests, and automated AI reviews, you must first connect the ShipFlow GitHub App to your account.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href={DASHBOARD_ROUTES.github} />} size="lg" className="px-8">
          Configure GitHub App
        </Button>
      </div>
    );
  }

  const { repoSummary, recentActivity, features, featureMetrics } = overview;

  // Custom status badge styling for feature requests
  const getFeatureStatusBadge = (status: string) => {
    let classes = "bg-muted text-muted-foreground border-border";
    let label = status.replace("_", " ");

    if (status === "draft") {
      classes = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    } else if (status === "clarifying") {
      classes = "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse";
    } else if (status === "prd_ready") {
      classes = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    } else if (status === "planning") {
      classes = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    } else if (status === "development") {
      classes = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    } else if (status === "review") {
      classes = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    } else if (status === "ready_to_ship") {
      classes = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    } else if (status === "shipped") {
      classes = "bg-green-500/10 text-green-400 border-green-500/20";
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${classes}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Overview Stats Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* GitHub App Connection Card */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">GitHub Integration</CardTitle>
            <GithubLogo size={20} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground truncate">
              {overview.accountLogin}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected {overview.installedAt ? formatDistanceToNow(new Date(overview.installedAt), { addSuffix: true }) : ""}
            </p>
            <div className="mt-4 pt-4 border-t border-border flex justify-end">
              <Button nativeButton={false} render={<Link href={DASHBOARD_ROUTES.github} />} variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Manage Connection</span>
                <ArrowRight size={12} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Repositories Sync Summary Card */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Workspace Code</CardTitle>
            <Folder size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {repoSummary?.totalCount ?? 0} <span className="text-sm font-normal text-muted-foreground">Connected Repos</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" />
                {repoSummary?.syncedCount ?? 0} synced
              </span>
              {repoSummary?.syncingCount ? (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                  {repoSummary.syncingCount} syncing
                </span>
              ) : null}
              {repoSummary?.failedCount ? (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-destructive" />
                  {repoSummary.failedCount} failed
                </span>
              ) : null}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-end">
              <Button nativeButton={false} render={<Link href={DASHBOARD_ROUTES.repos} />} variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>View Repositories</span>
                <ArrowRight size={12} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Pipeline Summary Card */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Feature requests</CardTitle>
            <Sparkle size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {featureMetrics.total} <span className="text-sm font-normal text-muted-foreground">Total Ideas</span>
            </div>
            <div className="flex items-center gap-2.5 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-cyan-500" />
                {featureMetrics.active} active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-purple-500" />
                {featureMetrics.awaitingApproval} review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-green-500" />
                {featureMetrics.shipped} shipped
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-end">
              <Button nativeButton={false} render={<Link href={DASHBOARD_ROUTES.newFeature} />} variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Request Feature</span>
                <ArrowRight size={12} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Timeline Panel: Activity */}
        <Card className="md:col-span-2 border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Activity</CardTitle>
            <CardDescription>Timeline of repository synchronizations and feature request updates.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Clock size={36} className="text-muted-foreground/50 mb-2" />
                <p className="text-sm">No recent activity detected.</p>
                <p className="text-xs mt-1">Submit feature requests or sync your repositories to start tracking activity.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 after:absolute after:inset-y-1 after:left-2.5 after:w-0.5 after:bg-border">
                {recentActivity.map((activity) => {
                  let Icon = Clock;
                  let iconColor = "text-muted-foreground bg-muted";
                  
                  if (activity.type === "repo_synced") {
                    Icon = CheckCircle;
                    iconColor = "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400";
                  } else if (activity.type === "repo_failed") {
                    Icon = XCircle;
                    iconColor = "text-destructive bg-destructive/10";
                  } else if (activity.type === "repo_syncing") {
                    Icon = Clock;
                    iconColor = "text-blue-500 bg-blue-500/10 animate-pulse";
                  } else if (activity.type === "feature_updated" || activity.type === "feature_created") {
                    Icon = Sparkle;
                    iconColor = "text-purple-600 bg-purple-500/10 dark:text-purple-400";
                  }

                  return (
                    <div key={activity.id} className="relative flex flex-col gap-1.5">
                      {/* Timeline Icon Marker */}
                      <span className={`absolute -left-[23px] top-0.5 flex size-5 items-center justify-center rounded-full border border-background shadow-sm ${iconColor}`}>
                        <Icon size={12} />
                      </span>
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5 min-w-0">
                          {activity.link ? (
                            <Link href={activity.link} className="text-sm font-semibold hover:underline text-foreground truncate block">
                              {activity.title}
                            </Link>
                          ) : (
                            <h4 className="text-sm font-semibold text-foreground truncate">
                              {activity.title}
                            </h4>
                          )}
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Info Box & Feature Requests Stream Panel */}
        <div className="space-y-6">
          {/* Active Feature Requests Card */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold">Feature Requests & PRDs</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Active delivery tracks</CardDescription>
              </div>
              <Button 
                nativeButton={false} 
                render={<Link href={DASHBOARD_ROUTES.newFeature} />} 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Create Feature Request"
              >
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {features.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-3">
                  <Sparkle size={28} className="text-muted-foreground/40" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">No feature requests created</p>
                    <p className="text-[10px]">Start your product loop by submitting a request.</p>
                  </div>
                  <Button 
                    nativeButton={false} 
                    render={<Link href={DASHBOARD_ROUTES.newFeature} />} 
                    size="sm" 
                    className="h-7 text-[10px] px-3 gap-1"
                  >
                    <Plus size={10} />
                    <span>Create Request</span>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {features.map((feature) => (
                    <div key={feature.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <Link 
                          href={`/dashboard/features/${feature.id}/prd`} 
                          className="text-xs font-semibold hover:underline hover:text-primary text-foreground block truncate"
                        >
                          {feature.title}
                        </Link>
                        <span className="text-[10px] text-muted-foreground block">
                          Updated {formatDistanceToNow(new Date(feature.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="pt-0.5">
                        {getFeatureStatusBadge(feature.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Panel */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button nativeButton={false} render={<Link href={DASHBOARD_ROUTES.newFeature} className="w-full h-full flex items-center justify-start gap-2" />} className="w-full text-xs justify-start gap-2">
                <Sparkle size={16} />
                <span>Create Feature Request</span>
              </Button>
              <Button nativeButton={false} render={<Link href={DASHBOARD_ROUTES.repos} />} variant="outline" className="w-full text-xs justify-start gap-2">
                <Folder size={16} />
                <span>Sync Repositories</span>
              </Button>
              <Button nativeButton={false} render={<Link href={DASHBOARD_ROUTES.pullRequests} />} variant="outline" className="w-full text-xs justify-start gap-2">
                <GitPullRequest size={16} />
                <span>View PR History</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
