import { describe, expect, test } from "bun:test";
import { validateConfig } from "./config";
import { findToolByName, toLookupItems } from "./lookup";
import type { Tool } from "./types";

describe("Template Validation", () => {
  test("valid template passes validation", () => {
    const config = {
      tools: [],
      templates: [
        {
          name: "review",
          command: "amp -x 'Review this code: $@'",
          description: "Code review with Amp",
          aliases: ["rev"],
        },
      ],
    };
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  test("template without name fails validation", () => {
    const config = {
      tools: [],
      templates: [
        {
          command: "amp -x 'test'",
          description: "Test template",
        },
      ],
    };
    const errors = validateConfig(config);
    expect(errors.some((e) => e.path.includes("name"))).toBe(true);
  });

  test("template without command fails validation", () => {
    const config = {
      tools: [],
      templates: [
        {
          name: "test",
          description: "Test template",
        },
      ],
    };
    const errors = validateConfig(config);
    expect(errors.some((e) => e.path.includes("command"))).toBe(true);
  });

  test("template without description fails validation", () => {
    const config = {
      tools: [],
      templates: [
        {
          name: "test",
          command: "amp -x 'test'",
        },
      ],
    };
    const errors = validateConfig(config);
    expect(errors.some((e) => e.path.includes("description"))).toBe(true);
  });

  test("template with unsafe command characters fails validation", () => {
    const config = {
      tools: [],
      templates: [
        {
          name: "evil",
          command: "rm -rf /; echo pwned",
          description: "Malicious template",
        },
      ],
    };
    const errors = validateConfig(config);
    expect(errors.some((e) => e.message.includes("unsafe"))).toBe(true);
  });

  test("template with common characters in command passes validation", () => {
    const config = {
      tools: [],
      templates: [
        {
          name: "review",
          command: "amp -x 'Review this code: $@'",
          description: "Review code",
        },
        {
          name: "explain",
          command: "claude 'Explain this file, please!'",
          description: "Explain code",
        },
        {
          name: "question",
          command: "opencode 'What does this do?'",
          description: "Ask question",
        },
      ],
    };
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  test("template aliases must be strings", () => {
    const config = {
      tools: [],
      templates: [
        {
          name: "test",
          command: "amp 'test'",
          description: "Test",
          aliases: [123, "valid"],
        },
      ],
    };
    const errors = validateConfig(config);
    expect(errors.some((e) => e.path.includes("aliases"))).toBe(true);
  });
});

describe("Template Lookup", () => {
  const tools: Tool[] = [{ name: "claude", command: "claude", aliases: ["c"] }];
  const templates: { name: string; command: string; description: string; aliases?: string[] }[] = [
    {
      name: "review",
      command: "amp -x 'Review: $@'",
      description: "Code review",
      aliases: ["rev", "code-review"],
    },
    {
      name: "explain",
      command: "claude 'Explain: $@'",
      description: "Explain code",
      aliases: ["exp"],
    },
  ];

  test("finds template by exact name", () => {
    const items = toLookupItems(tools, templates);
    const result = findToolByName("review", items);
    expect(result.success).toBe(true);
    expect(result.item?.name).toBe("review");
    expect(result.item?.isTemplate).toBe(true);
  });

  test("finds template by alias", () => {
    const items = toLookupItems(tools, templates);
    const result = findToolByName("rev", items);
    expect(result.success).toBe(true);
    expect(result.item?.name).toBe("review");
  });

  test("finds template by fuzzy match", () => {
    const items = toLookupItems(tools, templates);
    const result = findToolByName("revie", items);
    expect(result.success).toBe(true);
    expect(result.item?.name).toBe("review");
  });

  test("distinguishes tools from templates", () => {
    const items = toLookupItems(tools, templates);

    const toolResult = findToolByName("claude", items);
    expect(toolResult.success).toBe(true);
    expect(toolResult.item?.isTemplate).toBe(false);

    const templateResult = findToolByName("review", items);
    expect(templateResult.success).toBe(true);
    expect(templateResult.item?.isTemplate).toBe(true);
  });

  test("template lookup is case insensitive", () => {
    const items = toLookupItems(tools, templates);
    const result = findToolByName("REVIEW", items);
    expect(result.success).toBe(true);
    expect(result.item?.name).toBe("review");
  });
});

describe("Template Command Substitution", () => {
  function substituteTemplateArgs(command: string, args: string[]): string {
    if (command.includes("$@")) {
      return command.replace("$@", args.join(" "));
    }
    return args.length > 0 ? `${command} ${args.join(" ")}` : command;
  }

  test("substitutes $@ with arguments", () => {
    const command = "amp -x 'Review: $@'";
    const result = substituteTemplateArgs(command, ["file.ts"]);
    expect(result).toBe("amp -x 'Review: file.ts'");
  });

  test("substitutes $@ with multiple arguments", () => {
    const command = "amp -x 'Review: $@'";
    const result = substituteTemplateArgs(command, ["file1.ts", "file2.ts"]);
    expect(result).toBe("amp -x 'Review: file1.ts file2.ts'");
  });

  test("appends arguments when no $@ placeholder", () => {
    const command = "claude --help";
    const result = substituteTemplateArgs(command, ["extra", "args"]);
    expect(result).toBe("claude --help extra args");
  });

  test("returns command unchanged when no args and no $@", () => {
    const command = "amp --version";
    const result = substituteTemplateArgs(command, []);
    expect(result).toBe("amp --version");
  });

  test("handles empty $@ substitution", () => {
    const command = "amp -x 'Review: $@'";
    const result = substituteTemplateArgs(command, []);
    expect(result).toBe("amp -x 'Review: '");
  });
});

describe("Template Input Validation", () => {
  function validateTemplateInput(
    command: string,
    args: string[],
    stdin: string | null
  ): { valid: boolean; error?: string } {
    const hasInput = args.length > 0 || (stdin !== null && stdin.length > 0);
    if (command.includes("$@") && !hasInput) {
      return { valid: false, error: "This template requires input." };
    }
    return { valid: true };
  }

  test("template with $@ requires input", () => {
    const result = validateTemplateInput("amp -x 'Review: $@'", [], null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("requires input");
  });

  test("template with $@ accepts args", () => {
    const result = validateTemplateInput("amp -x 'Review: $@'", ["file.ts"], null);
    expect(result.valid).toBe(true);
  });

  test("template with $@ accepts stdin", () => {
    const result = validateTemplateInput("amp -x 'Review: $@'", [], "some stdin content");
    expect(result.valid).toBe(true);
  });

  test("template with $@ rejects empty stdin", () => {
    const result = validateTemplateInput("amp -x 'Review: $@'", [], "");
    expect(result.valid).toBe(false);
  });

  test("template without $@ does not require input", () => {
    const result = validateTemplateInput("amp --version", [], null);
    expect(result.valid).toBe(true);
  });

  test("args take priority over stdin", () => {
    const args = ["arg1", "arg2"];
    const stdin = "stdin content";
    const argsOrStdin = args.length > 0 ? args.join(" ") : (stdin ?? "");
    expect(argsOrStdin).toBe("arg1 arg2");
  });

  test("stdin used when no args provided", () => {
    const args: string[] = [];
    const stdin = "stdin content";
    const argsOrStdin = args.length > 0 ? args.join(" ") : (stdin ?? "");
    expect(argsOrStdin).toBe("stdin content");
  });
});

describe("Template Execution", () => {
  test("buildTemplateCommand function exists and works", async () => {
    const { buildTemplateCommand } = await import("./template");
    const result = buildTemplateCommand("amp -x 'Review: $@'", ["file.ts"]);
    expect(result).toBe("amp -x 'Review: file.ts'");
  });

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
