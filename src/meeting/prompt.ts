import { extractMeetingPrompt, MEETING_INSTRUCTIONS } from "../prompts/extract-meeting.ts";

export const INSTRUCTIONS = MEETING_INSTRUCTIONS;

export function buildMeetingPrompt(transcript: string): string {
  return extractMeetingPrompt.render({ transcript }).user;
}
