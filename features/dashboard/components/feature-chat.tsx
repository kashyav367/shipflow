"use client";

import { useState, useEffect, useRef } from "react";
import { sendChatMessage, getChatMessages } from "@/features/dashboard/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export function FeatureChat({ featureRequestId }: { featureRequestId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const msgs = await getChatMessages(featureRequestId);
        setMessages(msgs);
      } catch (error) {
        console.error("Failed to load chat messages:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchMessages();
  }, [featureRequestId]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input;
    setInput("");
    setLoading(true);

    try {
      // Add user message optimistically
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          role: "user",
          content: userInput,
          createdAt: new Date(),
        },
      ]);

      const response = await sendChatMessage(featureRequestId, userInput);

      // Replace optimistic message and add AI response
      setMessages((prev) => [
        ...prev.filter((m) => !m.id.startsWith("temp-")),
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: response.userMessage,
          createdAt: new Date(),
        },
        {
          id: response.savedMessageId,
          role: "assistant",
          content: response.assistantMessage,
          createdAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-96 bg-slate-950 border-slate-800">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>Start a conversation with ShipFlow AI about your feature...</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-slate-800 p-4 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask ShipFlow AI..."
          disabled={loading}
          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? <Spinner className="w-4 h-4" /> : "Send"}
        </Button>
      </form>
    </Card>
  );
}
