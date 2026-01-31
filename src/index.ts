#!/usr/bin/env bun

import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { executeDiffCommand, parseDiffArgs } from "./cli/diff";
import { loadConfig } from "./config";
import { detectInstalledTools, mergeTools } from "./detect";
import { fuzzySelect, promptForInput, toSelectableItems } from "./fuzzy-select";
import { getColoredLogo } from "./logo";
import { findToolByName, toLookupItems } from "./lookup";
import { isSafeCommand } from "./template";
import { upgrade } from "./upgrade";
import { VERSION } from "./version";

function handleChildProcessError(child: SpawnSyncReturns<string | Buffer>): void {
  if (child.error || child.signal) {
    console.error(
      child.error?.message ?? `Process terminated by signal ${child.signal ?? "unknown"}`
    );
    process.exit(1);
  }
}

function validateArguments(args: string[]): boolean {
  const safePattern = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;
  return args.every((arg) => safePattern.test(arg) && arg.length <= 200);
}

function readStdin(): string | null {
  try {
    if (process.stdin.isTTY) return null;
    return readFileSync(0, "utf-8").trim();
  } catch {
    return null;
  }
}

function showVersion() {
  console.log(`ai-cli-switcher v${VERSION}`);
  process.exit(0);
}

function showHelp() {
  console.log(getColoredLogo("full"));
  console.log(`A fast, secure launcher for AI coding assistants.

USAGE:
    ai [toolname|alias] [args...]    Direct invocation
    ai [toolname] -- [args...]       Explicit separator
    ai -- [args...]                  Fuzzy select, then pass args
    ai                               Interactive fuzzy search

OPTIONS:
    --help, -h                       Show this help message
    --version, -v                    Show version information
    --diff-staged                    Analyze staged git changes
    --diff-commit <ref>              Analyze git diff against ref (e.g., HEAD~1)
    --diff-prompt <text>             Add custom text to diff analysis prompt
    --diff-output <file>             Save analysis output to markdown file
    upgrade                          Upgrade to latest version

EXAMPLES:
    ai                               Launch fuzzy search
    ai claude                        Launch Claude directly
    ai c                             Launch by alias
    ai claude --help                 Pass --help to claude
    ai -- --version                  Select tool, then show version
    ai claude --diff-staged          Analyze staged changes with Claude
    ai --diff-commit HEAD~1          Select tool, analyze commit diff
    ai --diff-staged --diff-output analysis.md
                                     Save analysis to file
    ai --diff-commit HEAD~1 --diff-prompt "Focus on security"
                                     Add custom prompt
    ai upgrade                       Upgrade to latest version

CONFIG:
    ~/.config/ai-switcher/config.json   Add custom tools, aliases, templates
`);
  process.exit(0);
}

function launchTool(command: string, extraArgs: string[] = [], stdinContent: string | null = null) {
  if (!isSafeCommand(command)) {
    console.error("Invalid command format");
    process.exit(1);
  }

  if (!validateArguments(extraArgs)) {
    console.error("Invalid argument format");
    process.exit(1);
  }

  const hasArgs = extraArgs.length > 0;
  const hasStdin = stdinContent !== null && stdinContent.length > 0;

  if (command.includes("$@") && !hasArgs && !hasStdin) {
    console.error("This template requires input.");
    console.error("Usage: ai <template> <args...>  OR  <command> | ai <template>");
    process.exit(1);
  }

  const inputString = hasArgs ? extraArgs.join(" ") : (stdinContent ?? "");
  const usesPlaceholder = command.includes("$@");

  const finalCommand = usesPlaceholder
    ? command.replace("$@", inputString)
    : hasArgs || hasStdin
      ? `${command} ${inputString}`
      : command;

  const parts = finalCommand.split(/\s+/).filter((p) => p !== "");
  const [cmd, ...args] = parts;
  if (!cmd) {
    console.error("Empty command");
    process.exit(1);
  }

  const child = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
  });

  process.exit(child.status ?? 1);
}

function launchToolWithPrompt(
  command: string,
  prompt: string,
  useStdin = false,
  outputFile?: string
): never {
  if (!isSafeCommand(command)) {
    console.error("Invalid command format");
    process.exit(1);
  }

  const parts = command.split(/\s+/).filter((p) => p !== "");
  const [cmd, ...args] = parts;
  if (!cmd) {
    console.error("Empty command");
    process.exit(1);
  }

  if (outputFile) {
    let child: SpawnSyncReturns<string>;

    if (useStdin) {
      child = spawnSync(cmd, args, {
        input: prompt,
        stdio: ["pipe", "pipe", "inherit"],
        shell: true,
        encoding: "utf-8",
      });
    } else {
      const escapedPrompt = prompt.replace(/'/g, "'\\''");
      const finalCommand = `${command} '${escapedPrompt}'`;

      child = spawnSync("sh", ["-c", finalCommand], {
        stdio: ["inherit", "pipe", "inherit"],
        encoding: "utf-8",
      });
    }

    handleChildProcessError(child);

    const output = child.stdout || "";
    const resolvedPath = resolve(outputFile);

    try {
      writeFileSync(resolvedPath, output);
      console.log(`\n✅ Analysis saved to: ${resolvedPath}`);
    } catch (error) {
      console.error(`\n❌ Failed to write output to ${resolvedPath}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    process.exit(child.status ?? 0);
  }

  if (useStdin) {
    const child = spawnSync(cmd, args, {
      input: prompt,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    }) as SpawnSyncReturns<string | Buffer>;

    handleChildProcessError(child);

    process.exit(child.status ?? 0);
  }

  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const finalCommand = `${command} '${escapedPrompt}'`;

  const child = spawnSync("sh", ["-c", finalCommand], {
    stdio: "inherit",
  }) as SpawnSyncReturns<string | Buffer>;

  handleChildProcessError(child);

  process.exit(child.status ?? 0);
}

async function main() {
  const stdinContent = readStdin();

  const config = loadConfig();
  const detectedTools = detectInstalledTools();
  const allTools = mergeTools(config.tools, detectedTools);

  const items = toSelectableItems(allTools, config.templates);
  const lookupItems = toLookupItems(allTools, config.templates);

  if (items.length === 0) {
    console.error("❌ No AI tools found!\n");
    console.error("💡 Install one or more of these tools:");
    console.error("   • claude    - Anthropic Claude CLI");
    console.error("   • opencode  - OpenCode AI assistant");
    console.error("   • amp       - Sourcegraph Amp CLI");
    console.error("   • ccs       - Claude Code Switch");
    console.error("\n📝 Or add custom tools to ~/.config/ai-switcher/config.json");
    process.exit(1);
  }

  const args = process.argv.slice(2);

  if (args[0] === "--help" || args[0] === "-h") {
    showHelp();
  }

  if (args[0] === "--version" || args[0] === "-v") {
    showVersion();
  }

  if (args[0] === "upgrade") {
    await upgrade();
    return;
  }

  const diffParsed = parseDiffArgs(args);
  if (diffParsed.hasDiffCommand) {
    const { options, diffFlagIndex } = diffParsed;
    if (options && diffFlagIndex !== undefined) {
      const diffContext = { args, lookupItems, fuzzySelect, items };
      await executeDiffCommand(options, diffFlagIndex, diffContext, launchToolWithPrompt);
      return;
    }
  }

  const dashIndex = args.indexOf("--");
  if (dashIndex !== -1) {
    const beforeDash = args.slice(0, dashIndex);
    const afterDash = args.slice(dashIndex + 1);

    if (beforeDash.length === 0) {
      const result = await fuzzySelect(items);
      if (result.cancelled) {
        process.exit(0);
      }
      if (result.item) {
        launchTool(result.item.command, afterDash, stdinContent);
      }
      return;
    }

    const toolQuery = beforeDash[0];
    if (!toolQuery) {
      console.error("No tool specified before '--' separator");
      process.exit(1);
    }

    const lookupResult = findToolByName(toolQuery, lookupItems);
    if (lookupResult.success && lookupResult.item) {
      launchTool(lookupResult.item.command, afterDash, stdinContent);
      return;
    }
    console.error(lookupResult.error);
    process.exit(1);
  }

  if (args.length > 0) {
    const toolQuery = args[0];
    const extraArgs = args.slice(1);

    const result = findToolByName(toolQuery, lookupItems);

    if (result.success && result.item) {
      launchTool(result.item.command, extraArgs, stdinContent);
      return;
    }

    console.error(result.error);
    process.exit(1);
  }

  const result = await fuzzySelect(items);

  if (result.cancelled) {
    process.exit(0);
  }

  if (result.item) {
    if (result.item.isTemplate && result.item.command.includes("$@")) {
      console.log(`\nSelected: ${result.item.name}`);
      const input = await promptForInput(`Enter arguments for "${result.item.name}": `);
      if (input.length === 0) {
        process.exit(0);
      }
      const finalCommand = result.item.command.replace("$@", input);
      console.log(`\nRunning: ${finalCommand}\n`);
      launchTool(finalCommand, [], stdinContent);
    } else {
      console.log(`\nRunning: ${result.item.command}\n`);
      launchTool(result.item.command, [], stdinContent);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
