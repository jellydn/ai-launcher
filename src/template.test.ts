import { describe, expect, test } from "bun:test";

describe("Template Helpers", () => {
  test("isSafeCommand rejects dangerous patterns", async () => {
    const { isSafeCommand } = await import("./template");
    expect(isSafeCommand("rm -rf /")).toBe(false);
    expect(isSafeCommand("amp && rm -rf /")).toBe(false);
    expect(isSafeCommand("$(evil)")).toBe(false);
    expect(isSafeCommand("`evil`")).toBe(false);
  });

  test("isSafeCommand accepts safe patterns", async () => {
    const { isSafeCommand } = await import("./template");
    expect(isSafeCommand("amp -x 'Review: $@'")).toBe(true);
    expect(isSafeCommand("claude 'Explain this'")).toBe(true);
  });

  test("parseTemplateCommand splits command correctly", async () => {
    const { parseTemplateCommand } = await import("./template");
    const result = parseTemplateCommand("amp -x 'Review: hello'");
    expect(result.cmd).toBe("amp");
    expect(result.args).toContain("-x");
  });

  test("parseCommand handles quoted arguments without preserving quotes", async () => {
    const { parseCommand } = await import("./template");
    const result = parseCommand('opencode run --model "custom model" --agent plan');
    expect(result.cmd).toBe("opencode");
    expect(result.args).toEqual(["run", "--model", "custom model", "--agent", "plan"]);
  });

  test("parseCommand handles backtick-delimited prompts", async () => {
    const { parseCommand } = await import("./template");
    const result = parseCommand("ccs gemini `Explain this codebase architecture`");
    expect(result.cmd).toBe("ccs");
    expect(result.args).toEqual(["gemini", "Explain this codebase architecture"]);
  });
});

describe("Template Edge Cases", () => {
  test("template with multiple $@ placeholders", async () => {
    const { buildTemplateCommand } = await import("./template");
    const result = buildTemplateCommand("claude -p 'Review $@ and explain $@'", [
      "file1.ts",
      "file2.ts",
    ]);
    expect(result).toBe("claude -p 'Review file1.ts file2.ts and explain $@'");
  });

  test("template with empty args for $@", async () => {
    const { buildTemplateCommand } = await import("./template");
    const result = buildTemplateCommand("claude -p 'Summarize: $@'", []);
    expect(result).toBe("claude -p 'Summarize: '");
  });

  test("template with colon in name", async () => {
    const { parseTemplateCommand } = await import("./template");
    const result = parseTemplateCommand("ccs glm 'Create draft pr'");
    expect(result.cmd).toBe("ccs");
    expect(result.args).toEqual(["glm", "'Create draft pr'"]);
  });

  test("template command with double quotes inside single quotes", async () => {
    const { buildTemplateCommand, isSafeCommand } = await import("./template");
    const command = "claude -p 'Explain: \"hello world\" and more: $@'";
    const result = buildTemplateCommand(command, ["src/file.ts"]);
    expect(result).toBe("claude -p 'Explain: \"hello world\" and more: src/file.ts'");
    expect(isSafeCommand(command)).toBe(true);
  });

  test("template with complex prompt and special characters", async () => {
    const { isSafeCommand } = await import("./template");
    expect(
      isSafeCommand("claude -p 'Check [security] issues: (injection, xss, csrf) for: $@'")
    ).toBe(true);
  });
});

describe("Template Security", () => {
  test("rejects shell operators and command substitution", async () => {
    const { isSafeCommand } = await import("./template");
    expect(isSafeCommand("amp && rm -rf /")).toBe(false);
    expect(isSafeCommand("amp || rm -rf /")).toBe(false);
    expect(isSafeCommand("amp; rm -rf /")).toBe(false);
    expect(isSafeCommand("amp $(whoami)")).toBe(false);
    expect(isSafeCommand("amp `whoami`")).toBe(false);
    expect(isSafeCommand("sudo amp")).toBe(false);
    expect(isSafeCommand("amp > /dev/null")).toBe(false);
  });

  test("accepts special characters in prompts", async () => {
    const { isSafeCommand } = await import("./template");
    expect(isSafeCommand("claude -p 'Check <script> tags: $@'")).toBe(true);
    expect(isSafeCommand("amp 'Review <file>: $@'")).toBe(true);
    expect(isSafeCommand("claude -p 'Check A | B: $@'")).toBe(true);
  });
});
