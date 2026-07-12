import { describe, expect, spyOn, test } from "bun:test";
import { parseArgs, renderSummary } from "./index";
import type { MeetingSummary } from "./schema";

describe("parseArgs", () => {
  test("returns default options when no arguments are provided", () => {
    const options = parseArgs([]);

    expect(options.path).toBeUndefined();
    expect(options.json).toBe(false);
    expect(options.progress).toBe(false);
    expect(options.openrouter).toBe(false);
    expect(options.baseURL).toBeUndefined();
    expect(options.model).toBeUndefined();
    expect(options.temperature).toBeUndefined();
  });

  test("parses a positional path argument", () => {
    const options = parseArgs(["meeting.md"]);

    expect(options.path).toBe("meeting.md");
  });

  test("parses all flags", () => {
    const options = parseArgs([
      "notes.md",
      "--json",
      "--progress",
      "--openrouter",
      "--base-url",
      "https://api.example.com/v1",
      "--model",
      "gpt-4o",
      "--temperature",
      "0.5",
    ]);

    expect(options.path).toBe("notes.md");
    expect(options.json).toBe(true);
    expect(options.progress).toBe(true);
    expect(options.openrouter).toBe(true);
    expect(options.baseURL).toBe("https://api.example.com/v1");
    expect(options.model).toBe("gpt-4o");
    expect(options.temperature).toBe(0.5);
  });

  test("flags can appear before the path argument", () => {
    const options = parseArgs(["--json", "--model", "gpt-4o", "meeting.md"]);

    expect(options.path).toBe("meeting.md");
    expect(options.json).toBe(true);
    expect(options.model).toBe("gpt-4o");
  });

  test("throws on unknown options", () => {
    expect(() => parseArgs(["--unknown"])).toThrow("Unknown option: --unknown");
  });

  test("throws when --base-url is missing its value", () => {
    expect(() => parseArgs(["--base-url"])).toThrow("--base-url requires a value");
  });

  test("throws when --model is missing its value", () => {
    expect(() => parseArgs(["--model"])).toThrow("--model requires a value");
  });

  test("throws when --temperature is missing its value", () => {
    expect(() => parseArgs(["--temperature"])).toThrow("--temperature requires a value");
  });

  test("throws when --temperature is not a number", () => {
    expect(() => parseArgs(["--temperature", "hot"])).toThrow("--temperature must be a number");
  });

  test("shows help and exits on --help", () => {
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    try {
      expect(() => parseArgs(["--help"])).toThrow("process.exit");
    } finally {
      exitSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});

describe("renderSummary", () => {
  const sampleSummary: MeetingSummary = {
    summary: "Team sync on the BACX migration.",
    action_items: [{ owner: "Dung", task: "Move Better Auth to VPS", due: "Next week" }],
    risks: ["AWS migration delay"],
  };

  test("renders summary, action items, and risks", () => {
    const output = renderSummary(sampleSummary);

    expect(output).toContain("Team sync on the BACX migration.");
    expect(output).toContain("Move Better Auth to VPS");
    expect(output).toContain("Dung");
    expect(output).toContain("Next week");
    expect(output).toContain("AWS migration delay");
  });

  test("renders empty action items and risks as 'None'", () => {
    const output = renderSummary({
      summary: "Quick standup.",
      action_items: [],
      risks: [],
    });

    expect(output).toContain("Quick standup.");
    expect(output).toContain("Action items");
    expect(output).toContain("  None");
    expect(output).toContain("Risks");
  });

  test("includes action item formatting with owner and due date", () => {
    const output = renderSummary(sampleSummary);

    expect(output).toContain("- Move Better Auth to VPS — Dung (due Next week)");
  });
});
