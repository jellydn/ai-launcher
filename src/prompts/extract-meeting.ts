import { z } from "zod";
import { definePrompt } from "./render.ts";

const meetingVariablesSchema = z.object({
  transcript: z.string().min(1, "transcript is required"),
});

export type MeetingVariables = z.infer<typeof meetingVariablesSchema>;

export const MEETING_INSTRUCTIONS = `You are a structured meeting assistant.

Extract from the meeting transcript or notes:
1. A concise summary (2-4 sentences)
2. Action items with: owner, task, and due date/timeframe
3. Risks, blockers, or concerns

Output must be a JSON object matching this schema:
{
  "summary": "...",
  "action_items": [
    {"owner": "...", "task": "...", "due": "..."}
  ],
  "risks": ["..."]
}

Use empty arrays for action_items and risks if none are present.
Be specific, concise, and do not hallucinate details not in the transcript.`;

export const extractMeetingPrompt = definePrompt({
  id: "extract-meeting",
  version: "1.0.0",
  description: "Extract a summary, action items, and risks from meeting notes.",
  variables: [
    {
      name: "transcript",
      type: "string",
      required: true,
      description: "Meeting transcript or notes",
    },
  ],
  output: ["summary", "action_items", "risks"],
  schema: meetingVariablesSchema,
  render: ({ transcript }) => ({
    system: MEETING_INSTRUCTIONS,
    user: `Transcript:\n"""\n${transcript}\n"""`,
  }),
});
