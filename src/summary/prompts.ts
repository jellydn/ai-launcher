import { getModeInstruction } from "./detect.ts";
import type { SummaryCategory, SummaryMode } from "./schema.ts";

export const SUMMARY_JSON_SCHEMA = `{
  "title": "Optional detected title",
  "summary": "A concise 3-5 sentence summary",
  "key_points": [
    "Main point one",
    "Main point two"
  ],
  "action_items": [
    "Reply to the sender",
    "Review the linked document"
  ],
  "category": "newsletter",
  "importance": "medium"
}`;

export interface PromptInput {
  content: string;
  category: SummaryCategory;
  mode: SummaryMode;
  source: string;
}

export function buildSummaryPrompt(input: PromptInput): string {
  const modeInstruction = getModeInstruction(input.mode);
  const category = input.category === "unknown" ? "content" : input.category;

  return `You are a summarization assistant. Read the following ${category} from ${input.source} and produce a JSON object that conforms to this schema:

${SUMMARY_JSON_SCHEMA}

Instructions:
- Pick the category from "article", "email", "newsletter", or "unknown" based on the content.
- Pick the importance from "low", "medium", or "high" based on urgency and relevance.
- Include the title only if one can be detected or inferred from the content.
- ${modeInstruction}
- Return ONLY the JSON object. Do not wrap it in markdown code fences or add extra commentary.

Content:
---
${input.content}
---`;
}
