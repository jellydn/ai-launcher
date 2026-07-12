import { z } from "zod";

export const ActionItemSchema = z.object({
  owner: z.string().describe("Person responsible for this action item"),
  task: z.string().describe("Specific, actionable task to complete"),
  due: z.string().describe("Deadline or relative time frame"),
});

export const MeetingSummarySchema = z.object({
  summary: z.string().describe("Concise 2-4 sentence summary of the meeting"),
  action_items: z.array(ActionItemSchema).describe("Actionable items extracted from the meeting"),
  risks: z.array(z.string()).describe("Key risks, blockers, or concerns mentioned"),
});

export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
