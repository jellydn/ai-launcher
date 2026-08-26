import { spawnSync } from "node:child_process";
import type { KnownToolDefinition, KnownToolName, SuggestedInstallTool } from "./tool-catalog";
import {
  CCS_SUGGESTED_INSTALL_TOOL,
  CLI_PROXY_PROVIDERS,
  KNOWN_TOOLS,
  SUGGESTED_INSTALL_TOOL_NAMES,
} from "./tool-catalog";
import type { Tool } from "./types";

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

function validateCommandName(command: string): boolean {
  const safePattern = /^[a-zA-Z0-9._-]+$/;
  return safePattern.test(command) && command.length > 0 && command.length <= 100;
}

/**
 * Check whether a command is available on PATH.
 * Uses `where` on Windows and `which` elsewhere (`which` is not available on native Windows).
 */
export function commandExists(command: string): boolean {
  if (!validateCommandName(command)) {
    return false;
  }

  const locator = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(locator, [command], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    shell: false, // command names must not go through a shell
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
// result is stable for the lifetime of a single invocation, so memoize it.
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
        aliases: tool.aliases ? [...tool.aliases] : undefined,
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
  return detectionCache.slice();
}

export function mergeTools(configTools: Tool[], detectedTools: Tool[]): Tool[] {
  const configNames = new Set(configTools.map((t) => t.name.toLowerCase()));
  const configCommands = new Set(configTools.map((t) => t.command.toLowerCase()));

  const uniqueDetected = detectedTools.filter(
    (t) => !configNames.has(t.name.toLowerCase()) && !configCommands.has(t.command.toLowerCase())
  );

  return [...configTools, ...uniqueDetected];
}
