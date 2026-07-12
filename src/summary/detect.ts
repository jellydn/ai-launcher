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
  switch (mode) {
    case "tldr":
      return `tldr: Provide a concise 3-5 sentence summary. Keep key_points and action_items short and focused.`;
    case "actions":
      return `actions: Focus on deadlines, tasks, and action_items. Extract every actionable item and explicitly mention any deadlines or dates.`;
    case "linkedin":
      return `linkedin: Turn the content into a short LinkedIn post draft. The summary should be engaging, use a professional tone, and key_points should be punchy bullets. Include a clear call to action in action_items if appropriate.`;
    case "technical":
      return `technical: Preserve technical details, links, code snippets, and terminology. Be precise and do not oversimplify the technical content. Key_points should capture the technical takeaways.`;
    default:
      return `tldr`;
  }
}
