import { describe, expect, test } from "bun:test";
import { validateConfig, validateTemplate } from "./config";

describe("validateTemplate", () => {
  test("accepts valid template with $@ placeholder", () => {
    const template = {
      name: "review",
      command: "amp -x 'Review: $@'",
      description: "Code review",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors).toHaveLength(0);
  });

  test("accepts valid template without $@ placeholder", () => {
    const template = {
      name: "gemini",
      command: "ccs gemini 'Explain architecture'",
      description: "Architecture explanation",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors).toHaveLength(0);
  });

  test("accepts template metadata for read-only and mutating templates", () => {
    const readOnlyTemplate = {
      name: "review-security",
      command: "claude -p 'Security review: $@'",
      description: "Security review",
      mode: "read-only",
      requiresConfirmation: false,
    };

    const mutatingTemplate = {
      name: "commit-atomic",
      command: "opencode run 'Atomic commit: $@'",
      description: "Atomic commit",
      mode: "write",
      requiresConfirmation: true,
    };

    expect(validateTemplate(readOnlyTemplate, "templates[0]")).toEqual([]);
    expect(validateTemplate(mutatingTemplate, "templates[1]")).toEqual([]);
  });

  test("rejects invalid template metadata", () => {
    const template = {
      name: "bad",
      command: "claude 'test'",
      description: "Bad metadata",
      mode: "dangerous",
      requiresConfirmation: "yes",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors.some((error) => error.path.includes("mode"))).toBe(true);
    expect(errors.some((error) => error.path.includes("requiresConfirmation"))).toBe(true);
  });

  test("rejects template with multiple $@ placeholders", () => {
    const template = {
      name: "double",
      command: "cmd $@ and $@",
      description: "Double placeholder",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain("at most one $@ placeholder");
  });

  test("warns about $@ at start of command", () => {
    const template = {
      name: "bad",
      command: "$@ --flag",
      description: "Placeholder at start",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain("starts with $@");
  });

  test("rejects template with unsafe characters", () => {
    const template = {
      name: "unsafe",
      command: "cmd $(rm -rf /)",
      description: "Unsafe command",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toMatch(/unsafe (characters|command substitution)/);
  });

  test("requires name, command, and description", () => {
    const template = {
      name: "",
      command: "",
      description: "",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  test("accepts optional aliases array", () => {
    const template = {
      name: "review",
      command: "amp -x 'Review: $@'",
      description: "Code review",
      aliases: ["rev", "code-review"],
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors).toHaveLength(0);
  });

  test("rejects non-string aliases", () => {
    const template = {
      name: "review",
      command: "cmd",
      description: "Test",
      aliases: [123, "valid"] as unknown as string[],
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain("aliases");
  });

  test("accepts template with backtick characters for shell prompts", () => {
    const template = {
      name: "review-cleanup",
      command: "claude -p `You're reviewing code cleanup. Remove excessive comments: $@`",
      description: "AI-generated code cleanup",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors).toHaveLength(0);
  });

  test("accepts template with backticks and single quotes mixed", () => {
    const template = {
      name: "tidy-first",
      command: "claude -p `Apply Tidy First: 1) Guard clauses 2) Extract helpers. Focus on: $@`",
      description: "Apply tidy first principles",
    };

    const errors = validateTemplate(template, "templates[0]");
    expect(errors).toHaveLength(0);
  });
});

describe("validateConfig", () => {
  test("accepts a router config with safe command and promptUseStdin", () => {
    const config = {
      tools: [],
      templates: [],
      router: {
        command: "opencode run --model opencode/big-pickle --agent plan",
        promptUseStdin: true,
      },
    };

    expect(validateConfig(config)).toEqual([]);
  });

  test("rejects unsafe router command", () => {
    const config = {
      tools: [],
      templates: [],
      router: {
        command: "rm -rf /",
      },
    };

    const errors = validateConfig(config);
    expect(errors.some((error) => error.path === "router.command")).toBe(true);
  });
});
