import { z } from "zod";
import { definePrompt } from "./render.ts";

export const inputCategorySchema = z.enum([
  "article",
  "meeting",
  "git-diff",
  "email",
  "code",
  "unknown",
]);

const classifyVariablesSchema = z.object({
  content: z.string().min(1, "content is required"),
});

export type InputCategory = z.infer<typeof inputCategorySchema>;
export type ClassifyVariables = z.infer<typeof classifyVariablesSchema>;

export const classifyPrompt = definePrompt({
  id: "classify-input",
  version: "1.0.0",
  description: "Classify input so the launcher can recommend an appropriate workflow.",
  variables: [
    { name: "content", type: "string", required: true, description: "Content to classify" },
  ],
  output: ["category", "confidence", "reason"],
  schema: classifyVariablesSchema,
  render: ({ content }) => ({
    system: `You classify content for an AI workflow router.

Return only JSON with this shape:
{
  "category": "article | meeting | git-diff | email | code | unknown",
  "confidence": 0.0,
  "reason": "Brief evidence-based explanation"
}

Confidence must be between 0 and 1. Use "unknown" when the evidence is ambiguous. Do not use markdown code fences or add commentary.`,
    user: `Classify this content:\n\n---\n${content}\n---`,
  }),
});
