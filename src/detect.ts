import { spawnSync } from "node:child_process";
import type { Tool } from "./types";

export type KnownToolDefinition = {
  name: string;
  command: string;
  description: string;
  execCommand?: string;
  promptCommand?: string;
  promptUseStdin?: boolean;
};

export const KNOWN_TOOLS = [
  {
    name: "claude",
    command: "claude",
    description: "Anthropic Claude CLI",
    promptCommand: "claude --permission-mode plan -p",
  },
  {
    name: "cline",
    command: "cline",
    description: "Cline CLI - AI coding assistant",
    promptCommand: "cline -p",
  },
  {
    name: "gemini",
    command: "gemini",
    description: "Google Gemini CLI",
    promptCommand: "gemini -p",
  },
  {
    name: "agy",
    command: "agy",
    description: "Google Antigravity CLI",
  },
  {
    name: "opencode",
    command: "opencode",
    description: "OpenCode CLI",
    promptCommand: "opencode run --model opencode/big-pickle",
    promptUseStdin: true,
  },
  {
    name: "amp",
    command: "amp",
    description: "Sourcegraph Amp CLI",
    promptCommand: "amp -x",
    promptUseStdin: true,
  },
  {
    name: "copilot",
    command: "copilot",
    description: "GitHub Copilot CLI",
    promptCommand: "copilot suggest",
    promptUseStdin: true,
  },
  {
    name: "codex",
    command: "codex",
    description: "OpenAI Codex CLI",
    promptCommand: "codex exec",
  },
  {
    name: "kilo",
    command: "kilo",
    description: "Kilo Code CLI",
  },
  {
    name: "pi",
    command: "pi",
    description: "Pi AI CLI",
  },
  {
    name: "droid",
    command: "droid",
    description: "Factory Droid CLI",
  },
  {
    name: "ollama",
    command: "ollama",
    execCommand: "ollama launch --model minimax-m2.5:cloud",
    description: "Ollama CLI",
  },
  {
    name: "cursor-agent",
    command: "cursor-agent",
    description: "Cursor AI Editor",
  },
  {
    name: "cmd",
    command: "cmd",
    description: "Command Code CLI",
    promptCommand: "cmd -p",
  },
  {
    name: "freebuff",
    command: "freebuff",
    description: "Freebuff - Free ad-supported AI coding agent (Codebuff variant)",
  },
  {
    name: "grok",
    command: "grok",
    description: "xAI Grok Build CLI",
    promptCommand: "grok --permission-mode plan -p",
  },
  {
    name: "mimo",
    command: "mimo",
    description: "Mi AI (mimocode) CLI",
    promptCommand: "mimo run",
  },
  {
    name: "kimi",
    command: "kimi",
    description: "Kimi Code - Moonshot AI CLI",
    promptCommand: "kimi -p",
  },
] as const satisfies readonly KnownToolDefinition[];

export type KnownToolName = (typeof KNOWN_TOOLS)[number]["name"];

/** Curated subset of KNOWN_TOOLS shown when no AI tools are detected. */
export const SUGGESTED_INSTALL_TOOL_NAMES = [
  "claude",
  "agy",
  "opencode",
  "amp",
  "codex",
  "grok",
  "kimi",
  "ollama",
  "mimo",
] as const satisfies readonly KnownToolName[];

export type SuggestedInstallTool = {
  name: string;
  description: string;
};

const CCS_SUGGESTED_INSTALL_TOOL: SuggestedInstallTool = {
  name: "ccs",
  description: "CCS CLI (Claude Code Switch)",
};

function findKnownToolByName(name: KnownToolName): KnownToolDefinition {
  return KNOWN_TOOLS.find((t) => t.name === name) as KnownToolDefinition;
}

export function getSuggestedInstallTools(): SuggestedInstallTool[] {
  const fromKnown = SUGGESTED_INSTALL_TOOL_NAMES.map((name) => {
    const tool = findKnownToolByName(name);
    return { name: tool.name, description: tool.description };
  });

  return [...fromKnown, CCS_SUGGESTED_INSTALL_TOOL];
}

export function formatSuggestedInstallHints(): string[] {
  const tools = getSuggestedInstallTools();
  const nameWidth = Math.max(...tools.map((t) => t.name.length));

  return tools.map((tool) => `   • ${tool.name.padEnd(nameWidth)} - ${tool.description}`);
}

const CLI_PROXY_PROVIDERS: Array<{ name: string; description: string }> = [
  { name: "gemini", description: "Google Gemini (OAuth)" },
  { name: "codex", description: "OpenAI Codex (OAuth)" },
  { name: "agy", description: "Antigravity (OAuth)" },
  { name: "qwen", description: "Qwen Code (OAuth)" },
  { name: "iflow", description: "Iflow (OAuth)" },
  { name: "kiro", description: "Kiro (OAuth)" },
  { name: "ghcp", description: "GitHub Copilot (OAuth)" },
];

function validateCommandName(command: string): boolean {
  const safePattern = /^[a-zA-Z0-9._-]+$/;
  return safePattern.test(command) && command.length > 0 && command.length <= 100;
}

function commandExists(command: string): boolean {
  if (!validateCommandName(command)) {
    return false;
  }

  // "which" does not exist on Windows; use "where" there instead.
  const lookupCommand = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(lookupCommand, [command], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result.status === 0;
}

export function detectGhCopilot(): Tool | null {
  if (!commandExists("gh")) {
    return null;
  }

  try {
    const result = spawnSync("gh", ["copilot", "--version"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 3000,
    });

    if (result.status === 0) {
      return {
        name: "gh-copilot",
        command: "gh copilot",
        description: "GitHub Copilot CLI",
        promptCommand: "gh copilot suggest",
      };
    }
  } catch {
    // Extension not installed or not available
  }

  return null;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export function parseCcsApiList(output: string): string[] {
  const cleaned = stripAnsi(output);
  const lines = cleaned.split("\n");
  const activeProfiles: string[] = [];

  for (const line of lines) {
    const match = line.match(/[│|]\s*([^\s│|]+)\s*[│|].*?[│|]\s*\[OK\]\s*[│|]/);
    if (match?.[1] && match[1] !== "API") {
      activeProfiles.push(match[1]);
    }
  }

  return activeProfiles;
}

function detectCcsProfiles(): Tool[] {
  try {
    const result = spawnSync("ccs", ["api", "list"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 3000,
    });

    if (result.status !== 0 || !result.stdout) {
      return [];
    }

    const profiles = parseCcsApiList(result.stdout);

    return profiles.map((profile) => ({
      name: `ccs:${profile}`,
      command: `ccs ${profile}`,
      description: `CCS profile: ${profile}`,
      authType: "api_key",
      promptCommand: `ccs ${profile} --permission-mode plan -p`,
    }));
  } catch {
    return [];
  }
}

export function detectCliProxyProfiles(): Tool[] {
  return CLI_PROXY_PROVIDERS.map((provider) => ({
    name: `ccs:${provider.name}`,
    command: `ccs ${provider.name}`,
    description: provider.description,
    authType: "oauth",
    promptCommand: `ccs ${provider.name} --permission-mode plan -p`,
  }));
}

// Detection spawns several external processes (which/where, ccs, gh). The
// result is stable for the lifetime of a single invocation, so memoize it to
// avoid re-probing when the launcher calls detection more than once.
let detectionCache: Tool[] | null = null;

/** Clears the memoized detection result. Primarily useful in tests. */
export function resetDetectionCache(): void {
  detectionCache = null;
}

// Command names that collide with a built-in Windows executable and would
// therefore be falsely "detected" by `where` on Windows (e.g. cmd -> cmd.exe).
const WINDOWS_SHADOWED_COMMANDS = new Set(["cmd"]);

export function detectInstalledTools(): Tool[] {
  if (detectionCache !== null) {
    return detectionCache.slice();
  }

  const detected: Tool[] = [];
  const isWindows = process.platform === "win32";

  for (const entry of KNOWN_TOOLS) {
    const tool: KnownToolDefinition = entry;
    if (isWindows && WINDOWS_SHADOWED_COMMANDS.has(tool.command)) {
      continue;
    }
    if (commandExists(tool.command)) {
      detected.push({
        name: tool.name,
        command: tool.execCommand ?? tool.command,
        description: tool.description,
        promptCommand: tool.promptCommand,
        promptUseStdin: tool.promptUseStdin,
      });
    }
  }

  if (commandExists("ccs")) {
    detected.push({
      name: "ccs",
      command: "ccs",
      description: "CCS CLI (Claude Code Switch)",
    });

    detected.push(...detectCcsProfiles());
    detected.push(...detectCliProxyProfiles());
  }

  const ghCopilot = detectGhCopilot();
  if (ghCopilot) {
    detected.push(ghCopilot);
  }

  detectionCache = detected;
  return detected.slice();
}

export function mergeTools(configTools: Tool[], detectedTools: Tool[]): Tool[] {
  const configNames = new Set(configTools.map((t) => t.name.toLowerCase()));
  const configCommands = new Set(configTools.map((t) => t.command.toLowerCase()));

  const uniqueDetected = detectedTools.filter(
    (t) => !configNames.has(t.name.toLowerCase()) && !configCommands.has(t.command.toLowerCase())
  );

  return [...configTools, ...uniqueDetected];
}
