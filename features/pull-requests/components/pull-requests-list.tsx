"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  GitPullRequest, 
  CheckCircle, 
  Clock, 
  XCircle, 
  WarningCircle, 
  ArrowRight,
  MagnifyingGlass
} from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

type PRStatus = "all" | "pending" | "processing" | "reviewed" | "rate_limited";

interface PullRequestData {
  id: string;
  installationId: number;
  repoFullName: string;
  prNumber: number;
  title: string;
  authorLogin: string | null;
  headSha: string;
  baseBranch: string;
  status: string;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PullRequestsListProps {
  pullRequests: PullRequestData[];
}

export function PullRequestsList({ pullRequests }: PullRequestsListProps) {
  const [filter, setFilter] = useState<PRStatus>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    return {
      all: pullRequests.length,
      pending: pullRequests.filter((pr) => pr.status === "pending").length,
      processing: pullRequests.filter((pr) => pr.status === "processing").length,
      reviewed: pullRequests.filter((pr) => pr.status === "reviewed").length,
      rate_limited: pullRequests.filter((pr) => pr.status === "rate_limited").length,
    };
  }, [pullRequests]);

  const filteredPRs = useMemo(() => {
    const query = search.toLowerCase();

    return pullRequests.filter((pr) => {
      if (filter !== "all" && pr.status !== filter) {
        return false;
      }

      if (query) {
        const matchesTitle = pr.title.toLowerCase().includes(query);
        const matchesRepo = pr.repoFullName.toLowerCase().includes(query);
        const matchesNumber = String(pr.prNumber).includes(query);
        const matchesAuthor = pr.authorLogin?.toLowerCase().includes(query);

        if (!matchesTitle && !matchesRepo && !matchesNumber && !matchesAuthor) {
          return false;
        }
      }

      return true;
    });
  }, [pullRequests, filter, search]);

  let rows;

  if (pullRequests.length === 0) {
    rows = (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <GitPullRequest size={36} className="text-muted-foreground/40" />
            <p className="font-semibold text-sm">No Pull Requests found</p>
            <p className="text-xs max-w-xs leading-relaxed">
              Once you submit a Pull Request on a synced GitHub repository, the ShipFlow webhook will trigger and display it here.
            </p>
          </div>
        </TableCell>
      </TableRow>
    );
  } else if (filteredPRs.length === 0) {
    rows = (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
          No pull requests match your search or filter.
        </TableCell>
      </TableRow>
    );
  } else {
    rows = filteredPRs.map((pr) => (
      <TableRow key={pr.id} className="hover:bg-muted/30 transition-colors">
        {/* Repo & PR Number */}
        <TableCell>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground hover:underline">
              <Link href={`/dashboard/pull-requests/${pr.id}`}>
                {pr.repoFullName}
              </Link>
            </span>
            <span className="text-xs text-muted-foreground">PR #{pr.prNumber}</span>
          </div>
        </TableCell>

        {/* Title */}
        <TableCell className="max-w-xs truncate">
          <Link href={`/dashboard/pull-requests/${pr.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
            {pr.title}
          </Link>
        </TableCell>

        {/* Author */}
        <TableCell>
          <span className="text-sm text-foreground/80">
            {pr.authorLogin ? `@${pr.authorLogin}` : "—"}
          </span>
        </TableCell>

        {/* Status Badge */}
        <TableCell>
          <PRStatusBadge status={pr.status} />
        </TableCell>

        {/* Updated Timestamp */}
        <TableCell className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}
        </TableCell>

        {/* Action button */}
        <TableCell className="text-right">
          <Button 
            nativeButton={false} 
            render={<Link href={`/dashboard/pull-requests/${pr.id}`} />}
            variant="ghost" 
            size="sm" 
            className="h-8 gap-1 text-xs hover:text-primary"
          >
            <span>View Review</span>
            <ArrowRight size={12} />
          </Button>
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(val) => setFilter(val as PRStatus)} className="w-full sm:w-auto">
          <TabsList className="flex flex-wrap h-auto p-1">
            <TabsTrigger value="all" className="text-xs py-1.5 px-3">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="reviewed" className="text-xs py-1.5 px-3">Reviewed ({counts.reviewed})</TabsTrigger>
            <TabsTrigger value="processing" className="text-xs py-1.5 px-3">Processing ({counts.processing})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs py-1.5 px-3">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="rate_limited" className="text-xs py-1.5 px-3">Rate Limited ({counts.rate_limited})</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative max-w-xs w-full">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search pull requests..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[200px]">Repository</TableHead>
              <TableHead className="w-[300px]">Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rows}</TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Renders status badges corresponding to the state of code reviews.
 */
function PRStatusBadge({ status }: { status: string }) {
  let text = "Pending";
  let classes = "bg-muted text-muted-foreground border-border";
  let Icon = Clock;

  if (status === "reviewed") {
    text = "Reviewed";
    classes = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    Icon = CheckCircle;
  } else if (status === "processing") {
    text = "Processing";
    classes = "bg-blue-500/10 text-blue-500 border-blue-500/30 animate-pulse";
    Icon = Clock;
  } else if (status === "rate_limited") {
    text = "Rate Limited";
    classes = "bg-destructive/10 text-destructive border-destructive/30";
    Icon = WarningCircle;
  } else if (status === "failed") {
    text = "Failed";
    classes = "bg-destructive/10 text-destructive border-destructive/30";
    Icon = XCircle;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${classes}`}>
      <Icon size={10} />
      <span>{text}</span>
    </span>
  );
}
