import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isSafeCommand } from "./template";
import type { Config, ConfigValidationError, Template, Tool } from "./types";

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
    aliases: ["explain-code"],
  },
];

const DEFAULT_CONFIG: Config = {
  tools: [],
  templates: DEFAULT_TEMPLATES,
};

const CATEGORY_PROMPTS: Array<{
  name: string;
  description: string;
  aliases?: string[];
  prompt: string;
  requiresInput: boolean;
  preferredTools: string[];
}> = [
  {
    name: "review",
    description: "Code review",
    aliases: ["rev", "code-review"],
    prompt: "Review the following changes and provide feedback: $@",
    requiresInput: true,
    preferredTools: ["opencode", "claude", "amp", "codex", "ccs:mm", "ccs:*"],
  },
  {
    name: "commit-zen",
    description: "Generate commit message",
    aliases: ["zen", "logical-commit"],
    prompt:
      "Review the following changes and generate a concise git commit message, group by logical changes with commitizen convention, do atomic commit message: $@",
    requiresInput: true,
    preferredTools: ["opencode", "claude", "amp", "codex", "ccs:mm", "ccs:*"],
  },
  {
    name: "architecture-explanation",
    description: "Explain architecture",
    aliases: ["arch", "arch-explanation"],
    prompt: "Explain this codebase architecture",
    requiresInput: false,
    preferredTools: ["ccs:gemini", "claude", "codex", "opencode", "amp", "ccs:*"],
  },
  {
    name: "draft-pull-request",
    description: "Create draft pull request",
    aliases: ["pr", "draft-pr"],
    prompt: "Create draft pr with what why how by gh cli",
    requiresInput: false,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
  },
  {
    name: "types",
    description: "Enhance type safety",
    aliases: ["typescript"],
    prompt:
      "Improve TypeScript types: Remove any, add proper type guards, ensure strict mode compliance for: $@",
    requiresInput: true,
    preferredTools: ["ccs:mm", "claude", "opencode", "amp", "codex", "ccs:*"],
  },
  {
    name: "test",
    description: "Generate tests",
    aliases: ["spec", "tests"],
    prompt:
      "Write tests using Arrange-Act-Assert pattern. Focus on behavior, not implementation details for: $@",
    requiresInput: true,
    preferredTools: ["ccs:mm", "claude", "opencode", "amp", "codex", "ccs:*"],
  },
  {
    name: "docs",
    description: "Add documentation",
    aliases: ["document"],
    prompt: "Add JSDoc comments with @param and @returns. Include usage examples for: $@",
    requiresInput: true,
    preferredTools: ["ccs:mm", "claude", "opencode", "amp", "codex", "ccs:*"],
  },
  {
    name: "explain",
    description: "Code explanation",
    aliases: ["wtf", "explain-code"],
    prompt: "Explain this code in detail: 1) What it does 2) How it works 3) Design decisions: $@",
    requiresInput: true,
    preferredTools: ["ccs:mm", "claude", "opencode", "amp", "codex", "ccs:*"],
  },
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function pickTool(detectedTools: Tool[], preferredTools: string[]): Tool | undefined {
  const toolsByName = new Map(detectedTools.map((tool) => [normalizeName(tool.name), tool]));

  for (const preferred of preferredTools) {
    const normalized = normalizeName(preferred);
    if (normalized === "ccs:*") {
      const ccsProfile = detectedTools.find((tool) => normalizeName(tool.name).startsWith("ccs:"));
      if (ccsProfile) {
        return ccsProfile;
      }
      continue;
    }

    const directMatch = toolsByName.get(normalized);
    if (directMatch) {
      return directMatch;
    }
  }

  return undefined;
}

function buildCommandForTool(tool: Tool, prompt: string): string | null {
  const name = normalizeName(tool.name);
  if (name === "opencode") {
    return `opencode run --model opencode/big-pickle --agent plan '${prompt}'`;
  }
  if (name === "claude") {
    return `claude --permission-mode plan -p '${prompt}'`;
  }
  if (name === "amp") {
    return `amp -x '${prompt}'`;
  }
  if (name === "codex") {
    return `codex exec '${prompt}'`;
  }
  if (name.startsWith("ccs:") && tool.promptCommand) {
    return `${tool.promptCommand} '${prompt}'`;
  }

  return null;
}

function buildDefaultTemplates(detectedTools: Tool[]): Template[] {
  if (detectedTools.length === 0) {
    return [];
  }

  const templates: Template[] = [];

  for (const category of CATEGORY_PROMPTS) {
    const tool = pickTool(detectedTools, category.preferredTools);
    if (!tool) {
      continue;
    }

    const prompt = category.requiresInput ? category.prompt : category.prompt.replace(": $@", "");
    const command = buildCommandForTool(tool, prompt);
    if (!command) {
      continue;
    }

    templates.push({
      name: category.name,
      command,
      description: `${category.description} with ${tool.name}`,
      aliases: category.aliases,
    });
  }

  return templates;
}

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

function createDefaultConfig(templates: Template[]): void {
  ensureConfigDir();
  const defaultConfig: Config = {
    ...DEFAULT_CONFIG,
    templates,
  };
  writeFileSync(CONFIG_PATH, `${JSON.stringify(defaultConfig, null, 2)}\n`);
}

export function loadConfig(detectedTools: Tool[] = []): Config {
  if (!existsSync(CONFIG_PATH)) {
    const templates = buildDefaultTemplates(detectedTools);
    createDefaultConfig(templates);
    return { ...DEFAULT_CONFIG, templates };
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
