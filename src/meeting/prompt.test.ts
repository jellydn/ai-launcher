import { describe, expect, test } from "bun:test";
import { buildMeetingPrompt, INSTRUCTIONS } from "./prompt";

describe("buildMeetingPrompt", () => {
  test("wraps a transcript in a labeled block", () => {
    const prompt = buildMeetingPrompt("Dung will move Better Auth to VPS.");

    expect(prompt).toContain("Transcript:");
    expect(prompt).toContain('"""');
    expect(prompt).toContain("Dung will move Better Auth to VPS.");
  });

  test("preserves multiline transcript content", () => {
    const transcript = "Line 1\nLine 2\nLine 3";
    const prompt = buildMeetingPrompt(transcript);

    expect(prompt).toContain(transcript);
    expect(prompt).toMatch(/^Transcript:\n"""[\s\S]*"""$/);
  });
});

describe("INSTRUCTIONS", () => {
  test("contains the assistant role and extraction instructions", () => {
    expect(INSTRUCTIONS).toContain("You are a structured meeting assistant.");
    expect(INSTRUCTIONS).toContain("summary");
    expect(INSTRUCTIONS).toContain("action_items");
    expect(INSTRUCTIONS).toContain("risks");
  });

  test("contains the expected JSON schema example", () => {
    expect(INSTRUCTIONS).toContain('"summary": "..."');
    expect(INSTRUCTIONS).toContain('"action_items":');
    expect(INSTRUCTIONS).toContain('"risks":');
  });

  test("warns against hallucinating details", () => {
    expect(INSTRUCTIONS).toContain("do not hallucinate details not in the transcript");
  });
});
