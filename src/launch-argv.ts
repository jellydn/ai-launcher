import { parseTemplateCommand } from "./template";

/** Strip a matching pair of outer quotes left by parseTemplateCommand. */
export function stripOuterQuotes(token: string): string {
  if (token.length < 2) return token;
  const first = token[0];
  const last = token[token.length - 1];
  if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
    return token.slice(1, -1);
  }
  return token;
}

/**
 * Build argv for a template/tool command without a shell.
 * Substitutes $@ inside the token that contains it so multi-word / large input
 * stays a single argv element (no whitespace re-split, no shell re-parse).
 */
export function buildLaunchArgv(command: string, input: string): { cmd: string; args: string[] } {
  const placeholderCount = (command.match(/\$@/g) ?? []).length;
  if (placeholderCount > 1) {
    throw new Error(
      "Template command should contain at most one $@ placeholder. Multiple placeholders are not supported."
    );
  }

  const parsed = parseTemplateCommand(command);
  if (!parsed.cmd) {
    throw new Error("Empty command");
  }

  if (placeholderCount === 1) {
    const args = parsed.args.map((arg) => {
      if (arg.includes("$@")) {
        return stripOuterQuotes(arg.replace("$@", input));
      }
      return stripOuterQuotes(arg);
    });
    // Placeholder was the entire command (rare) or only in cmd
    const cmd = parsed.cmd.includes("$@")
      ? stripOuterQuotes(parsed.cmd.replace("$@", input))
      : parsed.cmd;
    return { cmd, args };
  }

  const args = parsed.args.map(stripOuterQuotes);
  if (input.length > 0) {
    args.push(input);
  }
  return { cmd: parsed.cmd, args };
}
