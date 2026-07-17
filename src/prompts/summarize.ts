import { z } from "zod";
import { definePrompt } from "./render.ts";

const summaryVariablesSchema = z.object({
  content: z.string().min(1, "content is required"),
  mode: z.enum(["tldr", "actions", "linkedin", "technical"]),
  maxLength: z.number().int().positive().optional(),
  audience: z.string().min(1).optional(),
  category: z.enum(["article", "email", "newsletter", "unknown"]).optional(),
  source: z.string().min(1).optional(),
});

export type SummarizeVariables = z.infer<typeof summaryVariablesSchema>;

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

const modeInstructions: Record<SummarizeVariables["mode"], string> = {
  tldr: "Provide a concise 3-5 sentence summary. Keep key_points and action_items short and focused.",
  actions:
    "Focus on deadlines, tasks, and action_items. Extract every actionable item and explicitly mention any deadlines or dates.",
  linkedin:
    "Turn the content into a short LinkedIn post draft. Use a professional, engaging tone and punchy key_points. Include a clear call to action in action_items if appropriate.",
  technical:
    "Preserve technical details, links, code snippets, and terminology. Be precise and do not oversimplify. Capture technical takeaways in key_points.",
};

export function getSummaryModeInstruction(mode: SummarizeVariables["mode"]): string {
  return `${mode}: ${modeInstructions[mode]}`;
}

export const summarizePrompt = definePrompt({
  id: "summarize-content",
  version: "1.0.0",
  description: "Summarize content for a chosen mode and audience.",
  variables: [
    { name: "content", type: "string", required: true, description: "Content to summarize" },
    { name: "mode", type: "SummaryMode", required: true, description: "Summary style" },
    {
      name: "maxLength",
      type: "positive integer",
      required: false,
      description: "Maximum summary length in words",
    },
    {
      name: "audience",
      type: "string",
      required: false,
      description: "Intended reader",
    },
    {
      name: "category",
      type: "SummaryCategory",
      required: false,
      description: "Detected content category",
    },
    { name: "source", type: "string", required: false, description: "Content source label" },
  ],
  output: ["title", "summary", "key_points", "action_items", "category", "importance"],
  schema: summaryVariablesSchema,
  render: ({ content, mode, maxLength, audience, category = "unknown", source = "input" }) => {
    const contentType = category === "unknown" ? "content" : category;
    const constraints = [
      audience ? `Write for ${audience}.` : undefined,
      maxLength ? `Keep the summary within ${maxLength} words.` : undefined,
    ].filter((value): value is string => value !== undefined);

    return {
      system: `You are a summarization assistant. Return only a JSON object matching this schema:\n\n${SUMMARY_JSON_SCHEMA}`,
      user: `Summarize the following ${contentType} from ${source}.

Instructions:
- Pick the category from "article", "email", "newsletter", or "unknown" based on the content.
- Pick the importance from "low", "medium", or "high" based on urgency and relevance.
- Include the title only if one can be detected or inferred from the content.
- ${getSummaryModeInstruction(mode)}${constraints.length > 0 ? `\n- ${constraints.join("\n- ")}` : ""}
- Return only JSON. Do not use markdown code fences or add commentary.

Content:
---
${content}
---`,
    };
  },
});
