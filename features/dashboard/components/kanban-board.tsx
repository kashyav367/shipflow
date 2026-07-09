"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AiReviewMarkdown } from "@/features/pull-requests/components/ai-review-markdown";
import { updateTaskStatus } from "@/features/dashboard/actions/features";
import { ChatTeardropText, FileText, Kanban, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
}

interface KanbanBoardProps {
  featureId: string;
  featureTitle: string;
  featureStatus: string;
  initialTasks: Task[];
  prdContent: string | null;
}

export function KanbanBoard({
  featureId,
  featureTitle,
  featureStatus,
  initialTasks,
  prdContent,
}: KanbanBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(featureStatus);

  // Auto-refresh when tasks are being generated
  useEffect(() => {
    if (currentStatus !== "planning" && currentStatus !== "prd_generating") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/features/${featureId}`, { cache: "no-store" });
        const data = await response.json();
        
        if (data.status !== currentStatus) {
          setCurrentStatus(data.status);
          toast.success("Status updated!");
        }

        if (data.tasks && data.tasks.length > tasks.length) {
          setTasks(data.tasks);
          toast.success(`${data.tasks.length} tasks created!`);
        }

        if (data.status === "development" || data.status === "ready_to_ship") {
          router.refresh();
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [currentStatus, featureId, tasks.length, router]);

  const handleStatusChange = async (taskId: string, newStatus: "todo" | "in_progress" | "review" | "done") => {
    setUpdatingTaskId(taskId);
    try {
      // Optimistic UI update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      
      // Save to database
      await updateTaskStatus(taskId, newStatus);
      toast.success("Task status updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update task status.");
      // Rollback on error
      setTasks(initialTasks);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const columns = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    review: tasks.filter((t) => t.status === "review"),
    done: tasks.filter((t) => t.status === "done"),
  };

  // Helper to get status indicators
  const getColumnDotColor = (colId: string) => {
    if (colId === "todo") return "bg-zinc-400";
    if (colId === "in_progress") return "bg-amber-500 animate-pulse";
    if (colId === "review") return "bg-indigo-500";
    return "bg-emerald-500";
  };

  const hasTasks = tasks.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Board Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kanban Task Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Managing tasks for: <span className="font-semibold text-primary">{featureTitle}</span> (Status: <span className="uppercase text-[11px] font-bold bg-muted px-2 py-0.5 rounded text-foreground">{featureStatus.replace("_", " ")}</span>)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Collapsible PRD Sheet directly on Kanban board */}
          {prdContent && (
            <Sheet>
              <SheetTrigger render={
                <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                  <FileText size={16} />
                  <span>View PRD Reference</span>
                </Button>
              } />
              <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto bg-card border-l border-border/80">
                <SheetHeader className="border-b border-border/60 pb-4 mb-4">
                  <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <FileText size={20} className="text-primary" />
                    <span>Product Requirements Document (PRD)</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="prose prose-zinc dark:prose-invert max-w-none text-xs leading-relaxed">
                  <AiReviewMarkdown content={prdContent} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Kanban Board Grid */}
      {hasTasks ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(columns).map(([colId, colTasks]) => (
            <div key={colId} className="bg-muted/20 p-4 rounded-2xl border border-border/60 space-y-4 shadow-sm flex flex-col min-h-[500px]">
              
              {/* Column Header */}
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${getColumnDotColor(colId)}`} />
                  <span>{colId.replace("_", " ")}</span>
                </div>
                <span className="bg-muted text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full border border-border/40">
                  {colTasks.length}
                </span>
              </h2>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => (
                    <Card 
                      key={task.id} 
                      className={`hover:shadow-md hover:border-border-hover transition group flex flex-col justify-between ${
                        updatingTaskId === task.id ? "opacity-60" : ""
                      }`}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                          {task.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <CardDescription className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line">
                          {task.description}
                        </CardDescription>
                        
                        {/* Status Select Controller */}
                        <div className="pt-2 border-t border-border/40 flex flex-col gap-1">
                          <label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                            Move Task To:
                          </label>
                          <select
                            value={task.status}
                            disabled={updatingTaskId === task.id}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                            className="w-full text-[10px] bg-muted/60 border border-border/80 rounded-md px-2 py-1 outline-none text-foreground focus:border-primary/80 transition cursor-pointer font-medium"
                          >
                            <option value="todo">Todo</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground text-xs py-16 border border-dashed border-border/60 rounded-xl bg-muted/5">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty / Not Ready Pipeline States */
        <div className="max-w-2xl mx-auto py-12 px-6 border border-border/80 bg-card/40 backdrop-blur-sm rounded-2xl shadow-lg flex flex-col items-center text-center space-y-6">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20 animate-pulse">
            <Kanban size={32} />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-foreground">
              {featureStatus === "draft" || featureStatus === "clarifying" 
                ? "AI Requirements Clarification Pending"
                : featureStatus === "prd_generating" || featureStatus === "prd_ready"
                ? "PRD Approval Pending"
                : "Tasks Generating..."}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              {featureStatus === "draft" || featureStatus === "clarifying"
                ? "The AI Analyst is clarifying details about this feature to draft the specifications. Complete the chat to proceed."
                : featureStatus === "prd_generating" || featureStatus === "prd_ready"
                ? "The AI has prepared the technical PRD document. Please review and approve it to generate the development tasks list."
                : "AI is currently breaking down the approved PRD specifications into granular coding tasks. Please wait a few moments."}
            </p>
          </div>

          <div className="pt-2">
            {featureStatus === "draft" || featureStatus === "clarifying" ? (
              <Button 
                onClick={() => router.push(`/dashboard/features/${featureId}/clarify`)}
                className="gap-2 shadow-lg shadow-primary/25"
              >
                <ChatTeardropText size={16} />
                <span>Open Clarification Chat</span>
                <ArrowRight size={14} />
              </Button>
            ) : featureStatus === "prd_generating" || featureStatus === "prd_ready" ? (
              <Button 
                onClick={() => router.push(`/dashboard/features/${featureId}/prd`)}
                className="gap-2 shadow-lg shadow-primary/25"
              >
                <FileText size={16} />
                <span>Go to AI PRD Review</span>
                <ArrowRight size={14} />
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/40 border border-border px-4 py-2 rounded-lg">
                <span className="size-2 rounded-full bg-primary animate-ping" />
                <span>AI Agent is creating tasks... Refreshing page soon.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
