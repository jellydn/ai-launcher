#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { loadConfig } from "./config";
import { detectInstalledTools, mergeTools } from "./detect";
import { fuzzySelect, toSelectableItems } from "./fuzzy-select";
import { findToolByName, toLookupItems } from "./lookup";
import { getColoredLogo } from "./logo";

function validateToolCommand(command: string): boolean {
  const safePattern = /^[a-zA-Z0-9._\s\-"':,!?/\\|$@]+$/;
  return safePattern.test(command.trim()) && command.length > 0 && command.length <= 500;
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

EXAMPLES:
    ai                               Launch fuzzy search
    ai claude                        Launch Claude directly
    ai c                             Launch by alias
    ai claude --help                 Pass --help to claude
    ai -- --version                  Select tool, then show version

CONFIG:
    ~/.config/ai-router/config.json    Add custom tools, aliases, templates
`);
  process.exit(0);
}

function launchTool(command: string, extraArgs: string[] = [], stdinContent: string | null = null) {
  if (!validateToolCommand(command)) {
    console.error("Invalid command format");
    process.exit(1);
  }

  if (!validateArguments(extraArgs)) {
    console.error("Invalid argument format");
    process.exit(1);
  }

  let finalCommand = command;

  const hasInput = extraArgs.length > 0 || (stdinContent !== null && stdinContent.length > 0);
  const argsOrStdin = extraArgs.length > 0 ? extraArgs.join(" ") : (stdinContent ?? "");

  if (command.includes("$@") && !hasInput) {
    console.error("This template requires input.");
    console.error("Usage: ai <template> <args...>  OR  <command> | ai <template>");
    process.exit(1);
  }

  if (command.includes("$@")) {
    finalCommand = command.replace("$@", argsOrStdin);
  } else if (argsOrStdin.length > 0) {
    finalCommand = `${command} ${argsOrStdin}`;
  }

  const parts = finalCommand.split(/\s+/).filter((p) => p !== "");
  const cmd = parts[0]!;
  const args = parts.slice(1);

  const child = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
  });

  process.exit(child.status ?? 1);
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
    console.error("\n📝 Or add custom tools to ~/.config/ai-router/config.json");
    process.exit(1);
  }

  const args = process.argv.slice(2);

  if (args[0] === "--help" || args[0] === "-h") {
    showHelp();
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
    } else if (beforeDash.length > 0) {
      const toolQuery = beforeDash[0]!;
      const lookupResult = findToolByName(toolQuery, lookupItems);
      if (lookupResult.success && lookupResult.item) {
        launchTool(lookupResult.item.command, afterDash, stdinContent);
        return;
      }
      console.error(lookupResult.error);
      process.exit(1);
    }
    return;
  }

  if (args.length > 0) {
    const toolQuery = args[0]!;
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
    launchTool(result.item.command, [], stdinContent);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
