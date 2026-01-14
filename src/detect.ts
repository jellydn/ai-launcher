import { spawnSync } from "node:child_process";
import type { Tool } from "./types";

const KNOWN_TOOLS: Array<{ name: string; command: string; description: string }> = [
  { name: "claude", command: "claude", description: "Anthropic Claude CLI" },
  { name: "opencode", command: "opencode", description: "OpenCode CLI" },
  { name: "amp", command: "amp", description: "Sourcegraph Amp CLI" },
];

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

  const result = spawnSync("which", [command], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result.status === 0;
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
  }));
}

export function detectInstalledTools(): Tool[] {
  const detected: Tool[] = [];

  for (const tool of KNOWN_TOOLS) {
    if (commandExists(tool.command)) {
      detected.push({
        name: tool.name,
        command: tool.command,
        description: tool.description,
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

  return detected;
}

export function mergeTools(configTools: Tool[], detectedTools: Tool[]): Tool[] {
  const configNames = new Set(configTools.map((t) => t.name.toLowerCase()));
  const configCommands = new Set(configTools.map((t) => t.command.toLowerCase()));

  const uniqueDetected = detectedTools.filter(
    (t) =>
      !configNames.has(t.name.toLowerCase()) &&
      !configCommands.has(t.command.toLowerCase())
  );

  return [...configTools, ...uniqueDetected];
}
