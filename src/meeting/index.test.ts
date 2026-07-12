import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { parseArgs, renderSummary, resolveProviderConfig } from "./index";
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

  test("throws when --temperature is not a finite number", () => {
    expect(() => parseArgs(["--temperature", "hot"])).toThrow(
      "--temperature must be a finite number"
    );
    expect(() => parseArgs(["--temperature", "Infinity"])).toThrow(
      "--temperature must be a finite number"
    );
    expect(() => parseArgs(["--temperature", "0.5junk"])).toThrow(
      "--temperature must be a finite number"
    );
  });

  test("throws when --temperature is out of range", () => {
    expect(() => parseArgs(["--temperature", "-1"])).toThrow(
      "--temperature must be between 0 and 2"
    );
    expect(() => parseArgs(["--temperature", "3"])).toThrow(
      "--temperature must be between 0 and 2"
    );
  });

  test("accepts temperature at the boundaries", () => {
    expect(parseArgs(["--temperature", "0"]).temperature).toBe(0);
    expect(parseArgs(["--temperature", "2"]).temperature).toBe(2);
  });

  test("throws when a value option is followed by another flag", () => {
    expect(() => parseArgs(["--model", "--json"])).toThrow("--model requires a value");
    expect(() => parseArgs(["--base-url", "--openrouter"])).toThrow("--base-url requires a value");
    expect(() => parseArgs(["--temperature", "--progress"])).toThrow(
      "--temperature requires a value"
    );
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

describe("resolveProviderConfig", () => {
  const originalEnv = { ...process.env };

  test("uses OPENAI_API_KEY for the default provider", () => {
    process.env = { OPENAI_API_KEY: "sk-openai" };

    const config = resolveProviderConfig({} as ReturnType<typeof parseArgs>);

    expect(config.apiKey).toBe("sk-openai");
    expect(config.baseURL).toBeUndefined();
    expect(config.model).toBeUndefined();
  });

  test("uses OPENROUTER_API_KEY when --openrouter is set", () => {
    process.env = { OPENROUTER_API_KEY: "sk-or" };

    const config = resolveProviderConfig({ openrouter: true } as ReturnType<typeof parseArgs>);

    expect(config.apiKey).toBe("sk-or");
    expect(config.baseURL).toBe("https://openrouter.ai/api/v1");
    expect(config.model).toBe("openrouter/free");
  });

  test("uses OPENAI_API_KEY for an OpenAI-compatible base URL", () => {
    process.env = { OPENAI_API_KEY: "sk-openai" };

    const config = resolveProviderConfig({
      baseURL: "https://openrouter.ai/api/v1",
    } as ReturnType<typeof parseArgs>);

    expect(config.apiKey).toBe("sk-openai");
    expect(config.baseURL).toBe("https://openrouter.ai/api/v1");
    expect(config.model).toBe("openrouter/free");
  });

  test("falls back to OPENROUTER_API_KEY for an OpenRouter base URL", () => {
    process.env = { OPENROUTER_API_KEY: "sk-or" };

    const config = resolveProviderConfig({
      baseURL: "https://openrouter.ai/api/v1",
    } as ReturnType<typeof parseArgs>);

    expect(config.apiKey).toBe("sk-or");
  });

  test("throws when OPENAI_API_KEY is missing for the default provider", () => {
    process.env = {};

    expect(() => resolveProviderConfig({} as ReturnType<typeof parseArgs>)).toThrow(
      "OPENAI_API_KEY is not set."
    );
  });

  test("throws when OPENROUTER_API_KEY is missing for --openrouter", () => {
    process.env = {};

    expect(() =>
      resolveProviderConfig({ openrouter: true } as ReturnType<typeof parseArgs>)
    ).toThrow("OPENROUTER_API_KEY is not set.");
  });

  test("throws with both key names for an OpenRouter base URL", () => {
    process.env = {};

    expect(() =>
      resolveProviderConfig({
        baseURL: "https://openrouter.ai/api/v1",
      } as ReturnType<typeof parseArgs>)
    ).toThrow("OPENAI_API_KEY or OPENROUTER_API_KEY is not set.");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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
