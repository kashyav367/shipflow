"use client";

import React, { useTransition } from "react";
import { toast } from "sonner";
import { ArrowClockwise, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { triggerPullRequestReviewAction } from "../actions";

interface TriggerReviewButtonProps {
  pullRequestId: string;
  status: string;
}

export function TriggerReviewButton({ pullRequestId, status }: TriggerReviewButtonProps) {
  const [isPending, startTransition] = useTransition();

  const isReviewing = status === "pending" || status === "processing" || isPending;

  const handleTrigger = () => {
    startTransition(async () => {
      const result = await triggerPullRequestReviewAction(pullRequestId);
      if (result.success) {
        toast.success("AI review has been successfully scheduled!");
      } else {
        toast.error(`Failed to trigger review: ${result.error || "Unknown error"}`);
      }
    });
  };

  return (
    <Button
      onClick={handleTrigger}
      disabled={isReviewing}
      variant={status === "reviewed" ? "outline" : "default"}
      size="sm"
      className="gap-2 text-xs"
    >
      <ArrowClockwise size={14} className={isReviewing ? "animate-spin" : ""} />
      <span>
        {isReviewing
          ? "Scheduling AI Review…"
          : status === "reviewed"
          ? "Re-run AI Review"
          : "Run AI Review"}
      </span>
    </Button>
  );
}
