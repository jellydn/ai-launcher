import { getSummaryModeInstruction } from "../prompts/summarize.ts";
import type { SummaryCategory, SummaryMode } from "./schema.ts";

const EMAIL_HEADERS = [
  /^from:/im,
  /^to:/im,
  /^subject:/im,
  /^date:/im,
  /^reply-to:/im,
  /^cc:/im,
  /^bcc:/im,
];

const NEWSLETTER_PATTERNS = [
  /unsubscribe/i,
  /newsletter/i,
  /weekly update/i,
  /daily digest/i,
  /what you missed/i,
  /issue\s+#?\d+/i,
  /\bsubscribe\b/i,
  /read this email online/i,
];

export function detectCategory(content: string): SummaryCategory {
  if (EMAIL_HEADERS.some((pattern) => pattern.test(content))) {
    return "email";
  }

  if (NEWSLETTER_PATTERNS.some((pattern) => pattern.test(content))) {
    return "newsletter";
  }

  const lowerContent = content.toLowerCase();
  if (lowerContent.includes("dear ")) {
    return "email";
  }

  return "unknown";
}

export function getModeInstruction(mode: SummaryMode): string {
  return getSummaryModeInstruction(mode);
}
