import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isSafeCommand } from "./template";
import type { Config, ConfigValidationError, Template, Tool } from "./types";

const CONFIG_DIR = join(homedir(), ".config", "ai-switcher");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const SAFE_COMMAND_PATTERN = /^[a-zA-Z0-9._\s-]+$/;

function countPlaceholders(command: string): number {
  return (command.match(/\$@/g) || []).length;
}

const DEFAULT_CONFIG: Config = {
  tools: [],
  templates: [],
};

const CATEGORY_PROMPTS: Array<{
  name: string;
  description: string;
  aliases?: string[];
  prompt: string;
  requiresInput: boolean;
  preferredTools: string[];
  permissionMode?: "plan" | "acceptEdits";
  agent?: "plan" | "build";
}> = [
  {
    name: "review",
    description: "Code review",
    aliases: ["rev", "code-review"],
    prompt: "Review the following changes and provide feedback: $@",
    requiresInput: true,
    preferredTools: ["opencode", "claude", "amp", "codex", "ccs:mm", "ccs:*"],
    permissionMode: "plan",
  },
  {
    name: "commit-zen",
    description: "Generate commit message",
    aliases: ["zen", "logical-commit"],
    prompt:
      "Review the following changes on git and generate a concise git commit message, group by logical changes with commitizen convention, do atomic commit message: $@",
    requiresInput: true,
    preferredTools: ["opencode", "claude", "amp", "codex", "ccs:mm", "ccs:*"],
    permissionMode: "plan",
  },
  {
    name: "commit-atomic",
    description: "Atomic commit message",
    aliases: ["ac", "auto-commit"],
    prompt:
      "Run git diff --staged then do atomic commit message for the change with commitizen convention. Write clear, informative commit messages that explain the what and why behind changes, not just the how.",
    requiresInput: false,
    preferredTools: ["opencode", "claude", "amp", "codex", "ccs:glm", "ccs:*"],
    permissionMode: "plan",
    agent: "build",
  },
  {
    name: "architecture-explanation",
    description: "Explain architecture",
    aliases: ["arch", "arch-explanation"],
    prompt: "Explain this codebase architecture",
    requiresInput: false,
    preferredTools: ["ccs:gemini", "claude", "codex", "opencode", "amp", "ccs:*"],
    permissionMode: "plan",
  },
  {
    name: "draft-pull-request",
    description: "Create draft pull request",
    aliases: ["pr", "draft-pr"],
    prompt: "Create draft pr with what why how by gh cli",
    requiresInput: false,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "types",
    description: "Enhance type safety",
    aliases: ["typescript"],
    prompt:
      "Improve TypeScript types: Remove any, add proper type guards, ensure strict mode compliance for: $@",
    requiresInput: true,
    preferredTools: ["ccs:mm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "test",
    description: "Generate tests",
    aliases: ["spec", "tests"],
    prompt:
      "Write tests using Arrange-Act-Assert pattern. Focus on behavior, not implementation details for: $@",
    requiresInput: true,
    preferredTools: ["ccs:mm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "docs",
    description: "Add documentation",
    aliases: ["document"],
    prompt: "Add JSDoc comments with @param and @returns. Include usage examples for: $@",
    requiresInput: true,
    preferredTools: ["ccs:mm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "explain",
    description: "Code explanation",
    aliases: ["wtf", "explain-code"],
    prompt: "Explain this code in detail: 1) What it does 2) How it works 3) Design decisions: $@",
    requiresInput: true,
    preferredTools: ["ccs:mm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "plan",
  },
  {
    name: "review-security",
    description: "Security-focused review",
    aliases: ["sec", "security"],
    prompt:
      "Security review: Check for injection vulnerabilities, input validation, auth issues, and sensitive data handling in: $@",
    requiresInput: true,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "plan",
  },
  {
    name: "review-refactor",
    description: "Refactoring recommendations",
    aliases: ["refactor"],
    prompt:
      "Refactor suggestion: Improve readability, eliminate complexity, and apply clean code principles to: $@",
    requiresInput: true,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "plan",
  },
  {
    name: "review-performance",
    description: "Performance review",
    aliases: ["perf", "optimize"],
    prompt:
      "Analyze performance: Identify bottlenecks, suggest optimizations with measurable impact for: $@",
    requiresInput: true,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "plan",
  },
  {
    name: "remove-verbal",
    description: "Clean verbal comments that explain 'what' the code is doing rather than 'why'",
    aliases: ["verbal", "comments"],
    prompt:
      "Analyze code: Identify verbal comment and remove it, and ensure consistency in style for: $@",
    requiresInput: true,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "remove-ai-slop",
    description: "Remove AI-generated code patterns",
    aliases: ["slop", "clean-ai"],
    prompt:
      "You're reviewing code cleanup. Remove: 1) Excessive comments that break existing documentation style 2) Defensive checks that don't match the codebase's trust model 3) Type escape hatches (any casts, assertions) 4) Generic patterns that feel imported rather than native. Match the file's existing voice and conventions. Report what you removed in 1-3 sentences: $@",
    requiresInput: true,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "tidy-first",
    description: "Tidy code before making changes",
    aliases: ["tidy"],
    prompt:
      "Apply Tidy First principles: 1) Use guard clauses 2) Extract helper variables for complex expressions 3) Remove dead code 4) Normalize symmetries. Focus on making the code easier to understand: $@",
    requiresInput: true,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "simplify",
    description: "Simplify over-engineered code",
    aliases: ["simple"],
    prompt:
      "Simplify this code: Remove unnecessary complexity, eliminate over-engineering, reduce coupling. Keep solutions simple and focused on what's actually needed: $@",
    requiresInput: true,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "simplifier",
    description:
      "Simplifies and refines code for clarity, consistency, and maintainability while preserving all functionality",
    aliases: ["simplify-code"],
    prompt: "@code-simplifier:code-simplifier",
    requiresInput: false,
    preferredTools: ["ccs:glm", "ccs:*"],
    permissionMode: "acceptEdits",
  },
  {
    name: "logical-grouping-pull-request",
    description: "Create a draft pull request for the git changes with logical grouping",
    aliases: ["split-pr"],
    prompt:
      "Analyze the git changes and create a draft PR, plan: 1) Group changes into logical, independent commits 2) Order them by dependency (low-level to high-level) 3) Run commit commit for each change group 4) Write PR description with what why how.",
    requiresInput: false,
    preferredTools: ["ccs:glm", "claude", "opencode", "amp", "codex", "ccs:*"],
    permissionMode: "acceptEdits",
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

function escapeSingleQuotes(str: string): string {
  return str.replace(/'/g, "'\\''");
}

function buildCommandForTool(
  tool: Tool,
  prompt: string,
  permissionMode: "plan" | "acceptEdits" = "plan",
  agent: "plan" | "build" = "plan"
): string | null {
  const name = normalizeName(tool.name);
  if (name === "opencode") {
    return `opencode run --model opencode/minimax-m2.5-free --agent ${agent} '${escapeSingleQuotes(prompt)}'`;
  }
  if (name === "claude") {
    return `claude --permission-mode ${permissionMode} -p '${escapeSingleQuotes(prompt)}'`;
  }
  if (name === "amp") {
    return `amp -x '${escapeSingleQuotes(prompt)}'`;
  }
  if (name === "codex") {
    return `codex exec '${escapeSingleQuotes(prompt)}'`;
  }
  if (name.startsWith("ccs:") && tool.promptCommand) {
    const cmd = tool.promptCommand.replace(
      "--permission-mode plan",
      `--permission-mode ${permissionMode}`
    );
    return `${cmd} '${escapeSingleQuotes(prompt)}'`;
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

    const command = buildCommandForTool(
      tool,
      category.prompt,
      category.permissionMode,
      category.agent
    );
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
  } else if (!SAFE_COMMAND_PATTERN.test(t.command.trim())) {
    errors.push({ path: `${path}.command`, message: "Tool command contains unsafe characters" });
  }

  if (t.description !== undefined && typeof t.description !== "string") {
    errors.push({ path: `${path}.description`, message: "Tool description must be a string" });
  }

  return [...errors, ...validateAliases(t.aliases, `${path}.aliases`)];
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
    const placeholderCount = countPlaceholders(t.command);
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
    return [
      ...errors,
      {
        path: `${path}.description`,
        message: "Template description is required and must be a non-empty string",
      },
      ...validateAliases(t.aliases, `${path}.aliases`),
    ];
  }

  return [...errors, ...validateAliases(t.aliases, `${path}.aliases`)];
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
