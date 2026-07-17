"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function PrdStatusPoller({ featureId }: { featureId: string }) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/features/${featureId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "prd_ready") {
          stopped = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          toast.success("PRD generated successfully!");
          router.refresh();
        }
      } catch (err) {
        console.error("PRD poller error:", err);
      }
    };

    // Poll immediately, then every 2s
    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      stopped = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [featureId, router]);

  return (
    <div className="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1.5 mt-2">
      <span className="size-1.5 rounded-full bg-indigo-500 animate-ping" />
      <span className="animate-pulse">Checking draft status...</span>
    </div>
  );
}
