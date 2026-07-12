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

export const CCS_SUGGESTED_INSTALL_TOOL: SuggestedInstallTool = {
  name: "ccs",
  description: "CCS CLI (Claude Code Switch)",
};

export const CLI_PROXY_PROVIDERS: Array<{ name: string; description: string }> = [
  { name: "gemini", description: "Google Gemini (OAuth)" },
  { name: "codex", description: "OpenAI Codex (OAuth)" },
  { name: "agy", description: "Antigravity (OAuth)" },
  { name: "qwen", description: "Qwen Code (OAuth)" },
  { name: "iflow", description: "Iflow (OAuth)" },
  { name: "kiro", description: "Kiro (OAuth)" },
  { name: "ghcp", description: "GitHub Copilot (OAuth)" },
];
