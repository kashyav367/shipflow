"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFeatureClarificationState } from "@/features/dashboard/actions/features";
import { toast } from "sonner";

export function PrdStatusPoller({ featureId }: { featureId: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const feature = await getFeatureClarificationState(featureId);
        if (feature && feature.status === "prd_ready") {
          toast.success("PRD generated successfully!");
          router.refresh();
        }
      } catch (err) {
        console.error("Poller error:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [featureId, router]);

  return (
    <div className="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1.5 mt-2 animate-pulse">
      <span className="size-1.5 rounded-full bg-indigo-500 animate-ping" />
      <span>Checking draft status...</span>
    </div>
  );
}
