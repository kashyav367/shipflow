import { generateText } from "ai";
import { openrouter } from "@/features/ai"

const REVIEW_MODEL = "google/gemini-2.5-flash"

const SYSTEM_PROMPT = `You are an expert code reviewer and QA engineer.
Your job is to evaluate if the provided code changes actually satisfy the Product Requirements Document (PRD).

## Review Checklist
1. **PRD Alignment** — Does the code actually implement the requirements and acceptance criteria outlined in the PRD?
2. **Correctness** — Are there bugs, logical errors, or incorrect assumptions in the code changes?
3. **Security & Performance** — Check for security risks, injection vulnerabilities, and memory leaks.
4. **Reliability** — Verify exception/error handling and edge cases.

## Output Format
Start with a **one-line summary** of the overall review result.

If there are issues, use these headings:

### ✅ What looks good
(briefly mention successfully implemented features)

### ⚠️ Suggestions
(non-blocking code quality improvements)

### 🚨 Issues
(blocking items: missing PRD requirements, bugs, or security holes that must be fixed before merging)

If the diff satisfies the PRD perfectly and there are no bugs, say "All requirements satisfied. Code is clean and ready for release."`;

type ReviewInput = {
    repoFullName: string;
    title: string;
    contextSnippets: string[];
    repoContextSnippets: string[];
    prdContent?: string; // <-- Add optional PRD content parameter
};

function buildRepoContextSection(repoContextSnippets: string[]) {
    if (repoContextSnippets.length === 0) {
        return "";
    }
    const repoContext = repoContextSnippets.join("\n\n---\n\n");
    return `\n\nRelated code from the repository:\n\n${repoContext}`;
}

export async function generateReview(input: ReviewInput) {
    const context = input.contextSnippets.join("\n\n---\n\n");
    const repoContextSection = buildRepoContextSection(input.repoContextSnippets);

    const prdSection = input.prdContent 
      ? `\n\n### Product Requirements (PRD) to verify against:\n\n${input.prdContent}` 
      : "";

    const { text } = await generateText({
        model: openrouter(REVIEW_MODEL, { maxTokens: 2000 }),
        system: SYSTEM_PROMPT,
        prompt: `Repository: ${input.repoFullName}
  Pull Request Title: ${input.title}
  
  Code Changes (Diff):
  ${context}${repoContextSection}${prdSection}`,
    });

    return text;
}
