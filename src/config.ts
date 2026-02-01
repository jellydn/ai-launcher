import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isSafeCommand } from "./template";
import type { Config, ConfigValidationError, Template } from "./types";

const CONFIG_DIR = join(homedir(), ".config", "ai-switcher");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_TEMPLATES: Template[] = [
  {
    name: "review",
    command:
      "opencode run --model opencode/big-pickle --agent plan 'Review the following changes and provide feedback: $@'",
    description: "Code review with OpenCode",
    aliases: ["rev", "code-review"],
  },
  {
    name: "commit-zen",
    command:
      "opencode run --model opencode/big-pickle --agent plan 'Review the following changes on git and generate a concise git commit message, group by logical changes with commitizen convention, do atomic commit message'",
    description: "Generate commit message with OpenCode",
    aliases: ["zen", "logical-commit"],
  },
  {
    name: "architecture-explanation",
    command: "ccs gemini 'Explain this codebase architecture'",
    description: "Explain architecture with Gemini",
    aliases: ["arch", "arch-explanation"],
  },
  {
    name: "draft-pull-request",
    command:
      "ccs glm --permission-mode acceptEdits -p 'Create draft pr with what why how by gh cli'",
    description: "Create draft pull request with GLM",
    aliases: ["pr", "draft-pr"],
  },
  {
    name: "types",
    command:
      "ccs mm --permission-mode acceptEdits -p 'Improve TypeScript types: Remove any, add proper type guards, ensure strict mode compliance for: $@'",
    description: "Enhance type safety",
    aliases: ["typescript"],
  },
  {
    name: "test",
    command:
      "ccs mm --permission-mode acceptEdits -p 'Write tests using Arrange-Act-Assert pattern. Focus on behavior, not implementation details for: $@'",
    description: "Generate tests",
    aliases: ["spec", "tests"],
  },
  {
    name: "docs",
    command:
      "ccs mm --permission-mode acceptEdits -p 'Add JSDoc comments with @param and @returns. Include usage examples for: $@'",
    description: "Add documentation",
    aliases: ["document"],
  },
  {
    name: "explain",
    command:
      "ccs mm --permission-mode plan -p 'Explain this code in detail: 1) What it does 2) How it works 3) Design decisions: $@'",
    description: "Code explanation",
    aliases: ["wtf", "explain-code"],
  },
];

const DEFAULT_CONFIG: Config = {
  tools: [],
  templates: DEFAULT_TEMPLATES,
};

function validateAliases(aliases: unknown, path: string): ConfigValidationError[] {
  if (!Array.isArray(aliases)) {
    if (aliases !== undefined) {
      return [{ path, message: "Aliases must be an array of strings" }];
    }
    return [];
  }

  const allStrings = aliases.every((a) => typeof a === "string");
  if (!allStrings) {
    return [{ path, message: "All aliases must be strings" }];
  }

  return [];
}

function validateTool(tool: unknown, index: number): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  const path = `tools[${index}]`;
  const t = tool as Record<string, unknown>;

  const hasValidName = typeof t.name === "string" && t.name.trim() !== "";
  if (!hasValidName) {
    errors.push({
      path: `${path}.name`,
      message: "Tool name is required and must be a non-empty string",
    });
  }

  if (typeof t.command !== "string" || t.command.trim() === "") {
    errors.push({
      path: `${path}.command`,
      message: "Tool command is required and must be a non-empty string",
    });
  } else {
    const safeCommandPattern = /^[a-zA-Z0-9._\s-]+$/;
    const isSafe = safeCommandPattern.test(t.command.trim());
    if (!isSafe) {
      errors.push({
        path: `${path}.command`,
        message: "Tool command contains unsafe characters",
      });
    }
  }

  const hasInvalidDescription = t.description !== undefined && typeof t.description !== "string";
  if (hasInvalidDescription) {
    errors.push({
      path: `${path}.description`,
      message: "Tool description must be a string",
    });
  }

  errors.push(...validateAliases(t.aliases, `${path}.aliases`));

  return errors;
}

export function validateTemplate(template: unknown, path: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  const t = template as Record<string, unknown>;

  if (typeof t.name !== "string" || t.name.trim() === "") {
    errors.push({
      path: `${path}.name`,
      message: "Template name is required and must be a non-empty string",
    });
  }

  if (typeof t.command !== "string" || t.command.trim() === "") {
    errors.push({
      path: `${path}.command`,
      message: "Template command is required and must be a non-empty string",
    });
  } else if (!isSafeCommand(t.command)) {
    errors.push({
      path: `${path}.command`,
      message: "Template command contains unsafe characters or patterns",
    });
  } else {
    const placeholderCount = (t.command.match(/\$@/g) || []).length;
    if (placeholderCount > 1) {
      errors.push({
        path: `${path}.command`,
        message:
          "Template command should contain at most one $@ placeholder. Multiple placeholders are not supported.",
      });
    }

    if (placeholderCount === 1 && t.command.trim().startsWith("$@")) {
      errors.push({
        path: `${path}.command`,
        message:
          "Template command starts with $@. Consider placing the placeholder after the base command for clarity.",
      });
    }
  }

  if (typeof t.description !== "string" || t.description.trim() === "") {
    errors.push({
      path: `${path}.description`,
      message: "Template description is required and must be a non-empty string",
    });
  }

  errors.push(...validateAliases(t.aliases, `${path}.aliases`));

  return errors;
}

export function validateConfig(config: unknown): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  const c = config as Record<string, unknown>;

  if (!Array.isArray(c.tools)) {
    errors.push({ path: "tools", message: "Config must have a 'tools' array" });
  } else {
    for (let i = 0; i < c.tools.length; i++) {
      errors.push(...validateTool(c.tools[i], i));
    }
  }

  if (!Array.isArray(c.templates)) {
    errors.push({
      path: "templates",
      message: "Config must have a 'templates' array",
    });
  } else {
    for (let i = 0; i < c.templates.length; i++) {
      errors.push(...validateTemplate(c.templates[i], `templates[${i}]`));
    }
  }

  return errors;
}

export function formatValidationErrors(errors: ConfigValidationError[]): string {
  const lines = ["Config validation failed:", ""];
  for (const error of errors) {
    const location = error.path ? `  ${error.path}: ` : "  ";
    lines.push(`${location}${error.message}`);
  }
  lines.push("");
  lines.push(`Config file: ${CONFIG_PATH}`);
  return lines.join("\n");
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function createDefaultConfig(): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    createDefaultConfig();
    return { ...DEFAULT_CONFIG };
  }

  const rawContent = readFileSync(CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(rawContent);

  const errors = validateConfig(parsed);
  if (errors.length > 0) {
    throw new Error(formatValidationErrors(errors));
  }

  return parsed as Config;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
