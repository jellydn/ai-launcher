import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { formatValidationErrors as formatPureErrors, validateConfig } from "./config-validation";
import type { Config, ConfigValidationError, Template } from "./types";

export { validateConfig };

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
    name: "summary",
    command: "ai summary --provider opencode --mode tldr $@",
    description: "Summarize content with OpenCode (free model)",
    aliases: ["sum", "summarize"],
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

function mergeTemplates(existing: Template[], defaults: Template[]): Template[] {
  const existingByName = new Map(existing.map((template) => [template.name, template]));
  let changed = false;

  for (const defaultTemplate of defaults) {
    const existingTemplate = existingByName.get(defaultTemplate.name);
    if (!existingTemplate) {
      existingByName.set(defaultTemplate.name, defaultTemplate);
      changed = true;
    }
  }

  const summaryTemplate = existingByName.get("summary");
  if (summaryTemplate && /^\s*ai-summary(?!\S)/.test(summaryTemplate.command.trim())) {
    existingByName.set("summary", {
      ...summaryTemplate,
      command: summaryTemplate.command.replace(/^\s*ai-summary(?!\S)/, "ai summary"),
    });
    changed = true;
  }

  const meetingTemplate = existingByName.get("meeting");
  if (meetingTemplate && /^\s*ai-meeting(?!\S)/.test(meetingTemplate.command)) {
    const migrated = meetingTemplate.command.replace(/^\s*ai-meeting(?!\S)/, "ai meeting");
    if (migrated !== meetingTemplate.command) {
      existingByName.set("meeting", {
        ...meetingTemplate,
        command: migrated,
      });
      changed = true;
    }
  }

  if (!changed) {
    return existing;
  }

  return Array.from(existingByName.values());
}

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

  const config = parsed as Config;
  const mergedTemplates = mergeTemplates(config.templates, DEFAULT_TEMPLATES);
  const hasTemplateChanges = mergedTemplates !== config.templates;
  config.templates = mergedTemplates;

  if (hasTemplateChanges) {
    const mergedErrors = validateConfig(config);
    if (mergedErrors.length > 0) {
      throw new Error(formatValidationErrors(mergedErrors));
    }
    ensureConfigDir();
    writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  }

  return config;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
