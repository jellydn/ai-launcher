import { describe, expect, test } from "bun:test";
import {
  buildRouterPrompt,
  parseRouterResponse,
  resolveRouterSelection,
  templateRequiresConfirmation,
} from "./router";

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
    expect(prompt).not.toContain("dryRun");
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
      '{"template":"review-security","arguments":["src/auth.ts"]}'
    );

    expect(result).toEqual({
      template: "review-security",
      arguments: ["src/auth.ts"],
    });
  });

  test("parses fenced JSON", () => {
    const result = parseRouterResponse(
      '```json\n{"template":"commit-atomic","arguments":["feat: add tests"]}\n```'
    );

    expect(result).toEqual({
      template: "commit-atomic",
      arguments: ["feat: add tests"],
    });
  });

  test("defaults arguments to an empty array when omitted", () => {
    const result = parseRouterResponse('{"template":"review-security"}');

    expect(result).toEqual({
      template: "review-security",
      arguments: [],
    });
  });

  test("rejects invalid output", () => {
    expect(parseRouterResponse("not json")).toBeNull();
    expect(parseRouterResponse('{"template":123,"arguments":[]}')).toBeNull();
    expect(parseRouterResponse('{"template":"review","arguments":"x"}')).toBeNull();
  });
});

describe("router selection helpers", () => {
  test("requires confirmation for write templates even when metadata is false", () => {
    expect(
      templateRequiresConfirmation({
        name: "commit-atomic",
        command: "opencode run 'Atomic commit'",
        description: "Atomic commit",
        mode: "write",
        requiresConfirmation: false,
      })
    ).toBe(true);
  });

  test("defaults to confirmation when metadata is missing", () => {
    expect(
      templateRequiresConfirmation({
        name: "review",
        command: "claude -p 'Review: $@'",
        description: "Code review",
      })
    ).toBe(true);
  });

  test("resolves a known template selection", () => {
    const template = TEMPLATES[0];
    if (!template) {
      throw new Error("missing test template");
    }
    expect(
      resolveRouterSelection({ template: "review-security", arguments: ["src/auth.ts"] }, TEMPLATES)
    ).toEqual({
      template,
      requiresConfirmation: false,
    });
  });

  test("rejects unknown templates", () => {
    expect(resolveRouterSelection({ template: "missing", arguments: [] }, TEMPLATES)).toBeNull();
  });
});
