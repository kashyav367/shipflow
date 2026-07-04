"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Robot, PaperPlaneTilt, User } from "@phosphor-icons/react";
import { submitClarificationAnswerAction, getFeatureClarificationState } from "@/features/dashboard/actions/features";
import { toast } from "sonner";

interface Clarification {
  id: string;
  question: string;
  answer: string | null;
  createdAt: Date;
}

interface ClarificationChatProps {
  featureId: string;
  featureTitle: string;
  initialStatus: string;
  initialClarifications: Clarification[];
}

export function ClarificationChat({
  featureId,
  featureTitle,
  initialStatus,
  initialClarifications,
}: ClarificationChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Clarification[]>(initialClarifications);
  const [status, setStatus] = useState<string>(initialStatus);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  // Find the first unanswered question
  const pendingQuestion = messages.find((c) => !c.answer);

  // If the status is already prd_ready or prd_generating, we should stop typing
  useEffect(() => {
    if (status !== "clarifying" && status !== "draft") {
      setIsAiTyping(false);
    }
  }, [status]);

  // Polling logic when AI is thinking/generating next questions
  useEffect(() => {
    if (!isAiTyping) return;

    let intervalId = setInterval(async () => {
      try {
        const feature = await getFeatureClarificationState(featureId);
        if (feature) {
          setStatus(feature.status);
          
          // Cast clarifications safely
          const updatedClarifications = feature.clarifications.map((c) => ({
            ...c,
            createdAt: new Date(c.createdAt),
          }));
          
          // Check if clarifications list has changed (e.g. new questions generated) or status updated
          const hasNewQuestions = updatedClarifications.length > messages.length;
          const hasNewAnswers = updatedClarifications.some(
            (c, idx) => messages[idx] && c.answer !== messages[idx].answer
          );

          if (hasNewQuestions || hasNewAnswers || feature.status !== "clarifying") {
            setMessages(updatedClarifications);
            setIsAiTyping(false);
            
            // If PRD is generating or ready, redirect to PRD page
            if (feature.status === "prd_generating" || feature.status === "prd_ready" || feature.status === "planning") {
              toast.success("All questions answered! Redirecting to PRD...");
              router.push(`/dashboard/features/${featureId}/prd`);
            }
          }
        }
      } catch (error) {
        console.error("Failed to poll clarification status:", error);
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [isAiTyping, featureId, messages, router]);

  // Send answer handler
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !pendingQuestion || isSubmitting) return;

    const answerText = input.trim();
    setInput("");
    setIsSubmitting(true);

    try {
      // Optimistically append the answer in UI
      setMessages((prev) =>
        prev.map((c) =>
          c.id === pendingQuestion.id ? { ...c, answer: answerText } : c
        )
      );

      setIsAiTyping(true);

      const result = await submitClarificationAnswerAction(featureId, pendingQuestion.id, answerText);

      if (result?.status === "clarifying" && result.question) {
        setMessages((prev) => [
          ...prev,
          {
            ...result.question,
            createdAt: new Date(result.question.createdAt),
          },
        ]);
      }

      if (result?.status === "prd_ready") {
        setStatus("prd_ready");
        toast.success("Requirements are ready. Opening the PRD...");
        router.push(`/dashboard/features/${featureId}/prd`);
        return;
      }

      setStatus(result?.status ?? status);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit answer.");
      setIsAiTyping(false);
    } finally {
      setIsSubmitting(false);
      setIsAiTyping(false);
    }
  };

  // Submit on Enter (without Shift)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-6 p-4">
      {/* Immersive ChatGPT-style chat workspace */}
      <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden flex flex-col h-[750px]">
        
        {/* Sleek chat header */}
        <div className="flex items-center gap-4 p-5 border-b border-border/60 bg-muted/10">
          <div className="size-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Robot size={22} className="animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              ShipFlow AI Requirement Analyst
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              Defining: <span className="font-semibold text-primary">{featureTitle}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">
              {isAiTyping ? "Analyzing..." : "Online"}
            </span>
          </div>
        </div>

        {/* Message Thread Area */}
        <div
          ref={scrollRef}
          className="flex-1 p-6 overflow-y-auto space-y-6 bg-gradient-to-b from-muted/5 to-muted/10 flex flex-col scroll-smooth"
        >
          {/* Welcome Message Bubble */}
          <div className="flex gap-4 max-w-[85%] items-start self-start animate-fade-in">
            <div className="size-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Robot size={16} className="text-muted-foreground" />
            </div>
            <div className="bg-muted/40 text-xs text-foreground p-4 rounded-2xl rounded-tl-none border border-border/60 shadow-sm leading-relaxed">
              <p className="font-medium text-indigo-500 mb-1">ShipFlow AI Analyst</p>
              Hello! I am analyzing your request: <strong>"{featureTitle}"</strong>. 
              To write a comprehensive, developer-ready Product Requirements Document (PRD), I have a few specific questions to clarify your goals and architecture constraints. Let's begin!
            </div>
          </div>

          {/* List of Q&As */}
          {messages.map((item, idx) => (
            <div key={item.id} className="space-y-6 flex flex-col w-full">
              {/* Question from AI */}
              <div className="flex gap-4 max-w-[85%] items-start self-start animate-fade-in">
                <div className="size-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Robot size={16} className="text-indigo-500" />
                </div>
                <div className="bg-muted/40 text-xs text-foreground p-4 rounded-2xl rounded-tl-none border border-border/60 shadow-sm leading-relaxed">
                  <p className="font-medium text-indigo-500 mb-1">Question {idx + 1}</p>
                  {item.question}
                </div>
              </div>

              {/* Answer from User */}
              {item.answer && (
                <div className="flex gap-4 max-w-[85%] self-end items-start animate-fade-in">
                  <div className="bg-primary text-primary-foreground text-xs p-4 rounded-2xl rounded-tr-none shadow-md leading-relaxed">
                    <p className="font-medium text-emerald-300 mb-1 text-[10px] uppercase tracking-wider">You</p>
                    {item.answer}
                  </div>
                  <div className="size-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md mt-0.5">
                    <User size={16} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isAiTyping && (
            <div className="flex gap-4 max-w-[85%] items-start self-start animate-fade-in">
              <div className="size-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Robot size={16} className="text-indigo-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-1 bg-muted/30 px-4 py-3 rounded-2xl rounded-tl-none border border-border/40">
                <span className="size-1.5 rounded-full bg-indigo-500/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1.5 rounded-full bg-indigo-500/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1.5 rounded-full bg-indigo-500/60 animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* ChatGPT-style input bar */}
        <div className="p-5 border-t border-border/60 bg-card">
          {pendingQuestion ? (
            <form onSubmit={handleSend} className="relative flex items-center bg-muted/30 border border-border/80 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/50 rounded-2xl px-4 py-3 transition shadow-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Reply to Question... (Press Enter to send, Shift+Enter for newline)`}
                required
                autoComplete="off"
                rows={1}
                disabled={isSubmitting}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-24 py-1 pr-12 min-h-[24px]"
              />
              
              <Button
                type="submit"
                disabled={!input.trim() || isSubmitting}
                className={`absolute right-3 bottom-2.5 size-8 rounded-xl p-0 flex items-center justify-center transition-all ${
                  input.trim()
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <PaperPlaneTilt size={16} weight="bold" />
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-2xl gap-2 text-center animate-pulse">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                <span>🎉 All clarification questions answered!</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ShipFlow AI is compile-drafting your technical Product Requirements Document (PRD).
              </p>
              <Button 
                onClick={() => router.push(`/dashboard/features/${featureId}/prd`)} 
                variant="outline" 
                size="sm"
                className="mt-1 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
              >
                Go to PRD Document &rarr;
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
