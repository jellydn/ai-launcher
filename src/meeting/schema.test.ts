import { describe, expect, test } from "bun:test";
import { ActionItemSchema, MeetingSummarySchema } from "./schema";

describe("ActionItemSchema", () => {
  test("parses a valid action item", () => {
    const item = { owner: "Dung", task: "Move Better Auth to VPS", due: "Next week" };

    expect(ActionItemSchema.parse(item)).toEqual(item);
  });

  test("rejects when owner is missing", () => {
    expect(() =>
      ActionItemSchema.parse({ task: "Move Better Auth to VPS", due: "Next week" })
    ).toThrow();
  });

  test("rejects when task is missing", () => {
    expect(() => ActionItemSchema.parse({ owner: "Dung", due: "Next week" })).toThrow();
  });

  test("rejects when due is missing", () => {
    expect(() =>
      ActionItemSchema.parse({ owner: "Dung", task: "Move Better Auth to VPS" })
    ).toThrow();
  });
});

describe("MeetingSummarySchema", () => {
  const validMeetingSummary = {
    summary: "Team sync on the BACX migration.",
    action_items: [{ owner: "Dung", task: "Move Better Auth to VPS", due: "Next week" }],
    risks: ["AWS migration delay"],
  };

  test("parses a valid meeting summary", () => {
    expect(MeetingSummarySchema.parse(validMeetingSummary)).toEqual(validMeetingSummary);
  });

  test("parses with empty action items and risks", () => {
    const summary = { summary: "Quick standup.", action_items: [], risks: [] };

    expect(MeetingSummarySchema.parse(summary)).toEqual(summary);
  });

  test("rejects when summary is missing", () => {
    expect(() =>
      MeetingSummarySchema.parse({
        action_items: [],
        risks: [],
      })
    ).toThrow();
  });

  test("rejects when summary is not a string", () => {
    expect(() =>
      MeetingSummarySchema.parse({
        summary: 123,
        action_items: [],
        risks: [],
      })
    ).toThrow();
  });

  test("rejects when action_items is not an array", () => {
    expect(() =>
      MeetingSummarySchema.parse({
        summary: "Team sync.",
        action_items: "none",
        risks: [],
      })
    ).toThrow();
  });

  test("rejects an invalid action item inside the array", () => {
    expect(() =>
      MeetingSummarySchema.parse({
        summary: "Team sync.",
        action_items: [{ owner: "Dung" }],
        risks: [],
      })
    ).toThrow();
  });
});
