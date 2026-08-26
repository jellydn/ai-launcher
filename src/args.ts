import { readFileSync } from "node:fs";

export interface ParsedArgs {
  toolQuery: string | null;
  extraArgs: string[];
  dashSeparator: boolean;
  beforeDash: string[];
  afterDash: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const dashIndex = argv.indexOf("--");
  if (dashIndex !== -1) {
    return {
      toolQuery: argv[0] ?? null,
      extraArgs: [],
      dashSeparator: true,
      beforeDash: argv.slice(0, dashIndex),
      afterDash: argv.slice(dashIndex + 1),
    };
  }
  return {
    toolQuery: argv[0] ?? null,
    extraArgs: argv.slice(1),
    dashSeparator: false,
    beforeDash: [],
    afterDash: [],
  };
}

export function readStdin(): string | null {
  try {
    const isInteractive = process.stdin.isTTY;
    if (isInteractive) return null;
    return readFileSync(0, "utf-8").trim();
  } catch {
    return null;
  }
}
