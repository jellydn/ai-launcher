import { SUMMARY_JSON_SCHEMA, summarizePrompt } from "../prompts/summarize.ts";
import type { SummaryCategory, SummaryMode } from "./schema.ts";

export { SUMMARY_JSON_SCHEMA };

export interface PromptInput {
  content: string;
  category: SummaryCategory;
  mode: SummaryMode;
  source: string;
}

export function buildSummaryPrompt(input: PromptInput): string {
  return summarizePrompt.render(input).user;
}
