"use client";

import React, { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

interface AiReviewMarkdownProps {
  content: string;
}

export function AiReviewMarkdown({ content }: AiReviewMarkdownProps) {
  if (!content) {
    return <p className="text-sm text-muted-foreground italic">No review content provided.</p>;
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Handle Code Blocks (```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <CodeBlockContainer key={`code-${i}`} code={codeLines.join("\n")} />
        );
        inCodeBlock = false;
        codeLines = [];
      } else {
        // Start of code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // 2. Handle Horizontal Rule (---)
    if (line.trim() === "---") {
      elements.push(<hr key={`hr-${i}`} className="my-6 border-t border-border" />);
      continue;
    }

    // 3. Handle Headings
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold tracking-tight text-foreground mt-8 mb-4 border-b border-border pb-2">
          {parseInline(line.substring(2))}
        </h1>
      );
      continue;
    } 
    if (line.startsWith("## ")) {
      const headingText = line.substring(3);
      // Special styling for major sections
      const isIssues = headingText.includes("🚨") || headingText.toLowerCase().includes("issue");
      elements.push(
        <h2 key={`h2-${i}`} className={`text-lg font-semibold tracking-tight mt-6 mb-3 flex items-center gap-2 ${isIssues ? "text-destructive" : "text-foreground"}`}>
          {parseInline(headingText)}
        </h2>
      );
      continue;
    } 
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-semibold tracking-tight text-foreground mt-5 mb-2">
          {parseInline(line.substring(4))}
        </h3>
      );
      continue;
    }

    // 4. Handle Blockquotes (>)
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={`quote-${i}`} className="border-l-4 border-primary/45 pl-4 italic text-muted-foreground my-4 bg-muted/30 py-2 pr-2 rounded-r-md text-sm">
          {parseInline(line.substring(2))}
        </blockquote>
      );
      continue;
    }

    // 5. Handle Bullet Lists (- or *)
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-6 my-1.5 space-y-1">
          <li className="text-sm text-foreground/90 leading-relaxed">
            {parseInline(line.substring(2))}
          </li>
        </ul>
      );
      continue;
    }

    // 6. Handle Numbered Lists (e.g. 1.)
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      const rest = match ? match[2] : line;
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal pl-6 my-1.5 space-y-1">
          <li className="text-sm text-foreground/90 leading-relaxed">
            {parseInline(rest)}
          </li>
        </ol>
      );
      continue;
    }

    // 7. Handle Empty Line
    if (line.trim() === "") {
      elements.push(<div key={`empty-${i}`} className="h-3" />);
      continue;
    }

    // 8. Normal Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm text-foreground/90 leading-relaxed my-2">
        {parseInline(line)}
      </p>
    );
  }

  return <div className="space-y-1 py-2">{elements}</div>;
}

/**
 * Parses bold (**bold**), italic (*italic* or _italic_), and inline code (`code`) within a line.
 */
function parseInline(text: string): React.ReactNode[] {
  // Regex to split by bold, italic, or inline code patterns
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
  return parts.map((part, index) => {
    // Bold
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Italic
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-foreground/95">
          {part.slice(1, -1)}
        </em>
      );
    }
    // Inline Code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-rose-500 dark:text-rose-400 border border-border">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Normal Text
    return part;
  });
}

/**
 * Premium code block container with header showing copy button.
 */
function CodeBlockContainer({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <div className="relative my-4 rounded-lg border border-border overflow-hidden bg-muted/40 font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted border-b border-border text-[10px] text-muted-foreground uppercase font-sans tracking-wider">
        <span>Code Snippet</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground transition-colors p-1 rounded-md"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto whitespace-pre leading-relaxed text-foreground bg-muted/20">
        <code>{code}</code>
      </pre>
    </div>
  );
}
