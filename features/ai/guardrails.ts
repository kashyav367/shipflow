/**
 * ShipFlow AI — Guardrails
 * ─────────────────────────────────────────────────────────────────
 * Validates inputs and outputs for all AI calls to:
 *   1. Prevent prompt injection attacks
 *   2. Block off-topic / abusive requests
 *   3. Enforce content length limits
 *   4. Validate AI outputs before saving to DB
 */

// ── Constants ─────────────────────────────────────────────────────

const MAX_TITLE_LENGTH = 200;
const MIN_TITLE_LENGTH = 3;
const MAX_DESCRIPTION_LENGTH = 5000;
const MIN_DESCRIPTION_LENGTH = 5;
const MAX_ANSWER_LENGTH = 3000;
const MAX_CHAT_MESSAGE_LENGTH = 2000;

/** Keywords that indicate prompt injection attempts */
const INJECTION_PATTERNS = [
  /ignore (all |previous |above |prior )?(instructions?|prompts?|rules?|context)/i,
  /you are now/i,
  /pretend (you are|to be|that)/i,
  /act as (a |an |if )/i,
  /forget (everything|all|your (instructions?|rules?|guidelines?))/i,
  /disregard (all |your |previous )?instructions/i,
  /new (instructions?|prompt|persona|role|task):/i,
  /\[system\]/i,
  /\[user\]/i,
  /\[assistant\]/i,
  /###\s*(instruction|prompt|system)/i,
  /<\/?system>/i,
];

/** Topics clearly unrelated to product/software development */
const OFF_TOPIC_PATTERNS = [
  /\b(hack|exploit|malware|ransomware|phishing|ddos|sql injection|xss|csrf)\b/i,
  /\b(bomb|weapon|drug|illegal|nsfw|explicit|porn)\b/i,
];

// ── Types ─────────────────────────────────────────────────────────

export type GuardrailResult =
  | { ok: true }
  | { ok: false; reason: string };

// ── Input Guardrails ──────────────────────────────────────────────

/**
 * Validate a feature request title + description before sending to AI
 */
export function validateFeatureInput(title: string, description: string): GuardrailResult {
  // Length checks
  if (!title || title.trim().length < MIN_TITLE_LENGTH) {
    return { ok: false, reason: `Title must be at least ${MIN_TITLE_LENGTH} characters.` };
  }
  if (title.trim().length > MAX_TITLE_LENGTH) {
    return { ok: false, reason: `Title must be under ${MAX_TITLE_LENGTH} characters.` };
  }
  if (!description || description.trim().length < MIN_DESCRIPTION_LENGTH) {
    return { ok: false, reason: `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.` };
  }
  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, reason: `Description must be under ${MAX_DESCRIPTION_LENGTH} characters.` };
  }

  // Prompt injection check
  const combined = `${title} ${description}`;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(combined)) {
      return { ok: false, reason: "Invalid input: prompt injection attempt detected." };
    }
  }

  // Off-topic / harmful content check
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(combined)) {
      return { ok: false, reason: "Input contains inappropriate content and cannot be processed." };
    }
  }

  return { ok: true };
}

/**
 * Validate a clarification answer before sending to AI
 */
export function validateClarificationAnswer(answer: string): GuardrailResult {
  if (!answer || answer.trim().length === 0) {
    return { ok: false, reason: "Answer cannot be empty." };
  }
  if (answer.trim().length > MAX_ANSWER_LENGTH) {
    return { ok: false, reason: `Answer must be under ${MAX_ANSWER_LENGTH} characters.` };
  }

  // Prompt injection check
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(answer)) {
      return { ok: false, reason: "Invalid input detected in your answer." };
    }
  }

  return { ok: true };
}

/**
 * Validate a chat message before sending to AI
 */
export function validateChatMessage(message: string): GuardrailResult {
  if (!message || message.trim().length === 0) {
    return { ok: false, reason: "Message cannot be empty." };
  }
  if (message.trim().length > MAX_CHAT_MESSAGE_LENGTH) {
    return { ok: false, reason: `Message must be under ${MAX_CHAT_MESSAGE_LENGTH} characters.` };
  }

  // Prompt injection check
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { ok: false, reason: "Invalid input detected in your message." };
    }
  }

  // Harmful content check
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(message)) {
      return { ok: false, reason: "Message contains inappropriate content." };
    }
  }

  return { ok: true };
}

// ── Output Guardrails ─────────────────────────────────────────────

/**
 * Validate that a generated PRD has the minimum expected structure
 * Returns warnings (doesn't block, just flags issues)
 */
export function validatePrdOutput(prd: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!prd || prd.trim().length < 100) {
    return { valid: false, warnings: ["PRD content is too short to be useful."] };
  }

  if (prd.trim().length > 10000) {
    warnings.push("PRD is unusually long — AI may have exceeded scope.");
  }

  const requiredSections = ["Summary", "Goals", "User Stor", "Technical", "Acceptance"];
  for (const section of requiredSections) {
    if (!prd.includes(section)) {
      warnings.push(`PRD may be missing the "${section}" section.`);
    }
  }

  return { valid: true, warnings };
}

/**
 * Validate a clarification question generated by AI
 */
export function validateAiQuestion(question: string): GuardrailResult {
  if (!question || question.trim().length < 10) {
    return { ok: false, reason: "AI-generated question is too short or empty." };
  }
  if (question.trim().length > 1000) {
    return { ok: false, reason: "AI-generated question is unusually long." };
  }
  // Must end in ? or have question-like content
  const hasQuestionMark = question.includes("?");
  if (!hasQuestionMark) {
    // Not a hard fail, just allow it — some questions don't end in ?
  }
  return { ok: true };
}

/**
 * Validate an AI chat response before saving to DB
 */
export function validateChatResponse(response: string): GuardrailResult {
  if (!response || response.trim().length < 5) {
    return { ok: false, reason: "AI response is too short or empty." };
  }
  if (response.trim().length > 8000) {
    return { ok: false, reason: "AI response exceeded maximum allowed length." };
  }
  return { ok: true };
}

// ── Rate-limit helper (per-request, stateless) ────────────────────

/**
 * Sanitize user input — strip null bytes and normalize whitespace
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/\0/g, "")           // remove null bytes
    .replace(/\r\n/g, "\n")       // normalize line endings
    .replace(/[ \t]{3,}/g, "  ")  // collapse excessive spaces/tabs
    .trim();
}
