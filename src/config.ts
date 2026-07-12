import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config, ConfigValidationError, Template } from "./types";

const CONFIG_DIR = join(homedir(), ".config", "ai-launcher");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const OLD_CONFIG_DIR = join(homedir(), ".config", "ai-switcher");
const OLD_CONFIG_PATH = join(OLD_CONFIG_DIR, "config.json");

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

import { formatValidationErrors as formatPureErrors, validateConfig } from "./config-validation";

export function formatValidationErrors(errors: ConfigValidationError[]): string {
  const pureFormatted = formatPureErrors(errors);
  return `${pureFormatted}\n\nConfig file: ${CONFIG_PATH}`;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function migrateOldConfig(): void {
  // If old config exists and new config doesn't, migrate it
  if (existsSync(OLD_CONFIG_PATH) && !existsSync(CONFIG_PATH)) {
    ensureConfigDir();
    try {
      copyFileSync(OLD_CONFIG_PATH, CONFIG_PATH);
      console.error(`✓ Migrated config from ${OLD_CONFIG_PATH} to ${CONFIG_PATH}`);
    } catch (error) {
      console.error(
        `⚠️  Failed to migrate config: ${error instanceof Error ? error.message : error}`
      );
    }
  }
}

function createDefaultConfig(): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
}

export function loadConfig(): Config {
  // Try to migrate old config first
  migrateOldConfig();

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
