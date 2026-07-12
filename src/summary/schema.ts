import { z } from "zod";

export const summaryModeSchema = z.enum(["tldr", "actions", "linkedin", "technical"]);

export const summaryCategorySchema = z.enum(["article", "email", "newsletter", "unknown"]);

export const summaryImportanceSchema = z.enum(["low", "medium", "high"]);

export const summarySchema = z.object({
  title: z.string().optional(),
  summary: z.string().min(1, "Summary cannot be empty"),
  key_points: z.array(z.string()),
  action_items: z.array(z.string()),
  category: summaryCategorySchema,
  importance: summaryImportanceSchema,
});

export type Summary = z.infer<typeof summarySchema>;
export type SummaryMode = z.infer<typeof summaryModeSchema>;
export type SummaryCategory = z.infer<typeof summaryCategorySchema>;
export type SummaryImportance = z.infer<typeof summaryImportanceSchema>;

export function isValidMode(value: unknown): value is SummaryMode {
  return summaryModeSchema.safeParse(value).success;
}

export function isValidCategory(value: unknown): value is SummaryCategory {
  return summaryCategorySchema.safeParse(value).success;
}

export function parseSummary(value: unknown): Summary {
  return summarySchema.parse(value);
}
