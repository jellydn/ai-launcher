import { describe, expect, test } from "bun:test";
import { buildRouterPrompt, parseRouterResponse } from "./router";

const TEMPLATES = [
  {
    name: "review-security",
    command: "claude -p 'Security review: $@'",
    description: "Security-focused review",
    aliases: ["sec", "security"],
    mode: "read-only" as const,
  },
  {
    name: "commit-atomic",
    command: "opencode run 'Atomic commit'",
    description: "Create an atomic commit",
    aliases: ["ac"],
    mode: "write" as const,
    requiresConfirmation: true,
  },
];

describe("buildRouterPrompt", () => {
  test("includes templates and task context", () => {
    const prompt = buildRouterPrompt("check src/auth.ts for security problems", TEMPLATES);

    expect(prompt).toContain("review-security");
    expect(prompt).toContain("commit-atomic");
    expect(prompt).toContain("User request:");
    expect(prompt).toContain("check src/auth.ts for security problems");
    expect(prompt).toContain("mode: read-only");
    expect(prompt).toContain("requiresConfirmation: yes");
  });

  test("includes stdin context when provided", () => {
    const prompt = buildRouterPrompt("review this", TEMPLATES, "diff --git a/src/a.ts b/src/a.ts");

    expect(prompt).toContain("Additional stdin context:");
    expect(prompt).toContain("diff --git a/src/a.ts b/src/a.ts");
  });
});

describe("parseRouterResponse", () => {
  test("parses raw JSON", () => {
    const result = parseRouterResponse(
      '{"template":"review-security","arguments":["src/auth.ts"],"dryRun":true}'
    );

    expect(result).toEqual({
      template: "review-security",
      arguments: ["src/auth.ts"],
      dryRun: true,
    });
  });

  test("parses fenced JSON", () => {
    const result = parseRouterResponse(
      "```json\n{\"template\":\"commit-atomic\",\"arguments\":[\"feat: add tests\"],\"dryRun\":false}\n```"
    );

    expect(result).toEqual({
      template: "commit-atomic",
      arguments: ["feat: add tests"],
      dryRun: false,
    });
  });

  test("defaults dryRun to true when omitted", () => {
    const result = parseRouterResponse('{"template":"review-security","arguments":[]}');

    expect(result).toEqual({
      template: "review-security",
      arguments: [],
      dryRun: true,
    });
  });

  test("rejects invalid output", () => {
    expect(parseRouterResponse("not json")).toBeNull();
    expect(parseRouterResponse('{"template":123,"arguments":[]}')).toBeNull();
    expect(parseRouterResponse('{"template":"review","arguments":"x"}')).toBeNull();
  });
});
