export interface ParsedCommand {
  cmd: string;
  args: string[];
}

// Allowlist pattern for safe shell characters in commands
const SAFE_COMMAND_PATTERN = /^[a-zA-Z0-9._\s\-"':,!?/\\|$@`()[\]<>]+$/;

// Blocked patterns for dangerous shell constructs
// Note: Backticks are allowed for shell-style prompts (e.g., `review $@`) per template security enhancement
const DANGEROUS_PATTERNS = [
  /&&/, // Command chaining
  /\|\|/, // Command chaining
  /;/, // Command separator
  /\$\(/, // Command substitution
  /`[a-zA-Z0-9_]+`/, // Backtick command substitution (simple command names like `whoami`)
  /\bsudo\b/, // Privilege escalation
  /\brm\s+-rf\b/, // Destructive file removal
  />\s*\//, // Output redirection
];

export function isSafeCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;
  if (command.length > 500) return false;
  if (!SAFE_COMMAND_PATTERN.test(trimmed)) return false;

  return !DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}

export function buildTemplateCommand(command: string, args: string[]): string {
  if (command.includes("$@")) {
    return command.replace("$@", args.join(" "));
  }
  if (args.length > 0) {
    return `${command} ${args.join(" ")}`;
  }
  return command;
}

export function validateTemplateCommand(command: string): boolean {
  return isSafeCommand(command);
}

export function parseTemplateCommand(command: string): ParsedCommand {
  if (command.length === 0) {
    return { cmd: "", args: [] };
  }

  const parts: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
    } else if (char === " " && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return {
    cmd: parts[0] ?? "",
    args: parts.slice(1),
  };
}
