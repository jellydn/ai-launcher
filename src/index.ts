#!/usr/bin/env bun

import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs, readStdin } from "./args";
import { executeDiffCommand, parseDiffArgs } from "./cli/diff";
import { loadConfig } from "./config";
import { detectInstalledTools, formatSuggestedInstallHints, mergeTools } from "./detect";
import { fuzzySelect, toSelectableItems } from "./fuzzy-select";
import { getColoredLogo } from "./logo";
import { findToolByName } from "./lookup";
import { promptForInput } from "./prompt-input";
import { buildRouterPrompt, parseRouterResponse, resolveRouterSelection } from "./router";
import { isSafeCommand, parseCommand, templateRequiresConfirmation } from "./template";
import type { SelectableItem, Template } from "./types";
import { upgrade } from "./upgrade";
import { validateArguments, validateOutputFile } from "./validation";
import { VERSION } from "./version";

const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_VALIDATION_ERROR = 1;
const EXIT_CODE_FILE_WRITE_ERROR = 2;
const EXIT_CODE_PROCESS_ERROR = 3;

function handleChildProcessError(child: SpawnSyncReturns<string | Buffer>): void {
  if (child.error || child.signal) {
    console.error(
      child.error?.message ?? `Process terminated by signal ${child.signal ?? "unknown"}`
    );
    process.exit(EXIT_CODE_PROCESS_ERROR);
  }
}

function showVersion() {
  console.log(`ai-launcher v${VERSION}`);
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
    ~/.config/ai-launcher/config.json   Add custom tools, aliases, templates
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
  const parsedCommand = parseCommand(command);
  const args = [...parsedCommand.args];

  if (command.includes("$@")) {
    const placeholderIndex = args.findIndex((arg) => arg.includes("$@"));
    const placeholder = placeholderIndex !== -1 ? args[placeholderIndex] : undefined;
    if (placeholder) {
      args[placeholderIndex] = placeholder.replace("$@", inputString);
    } else {
      args.push(inputString);
    }
  } else if (hasArgs) {
    args.push(...extraArgs);
  } else if (hasStdin) {
    args.push(stdinContent ?? "");
  }

  if (!parsedCommand.cmd) {
    console.error("Empty command");
    process.exit(1);
  }

  const child = spawnSync(parsedCommand.cmd, args, {
    stdio: "inherit",
    shell: false,
  });

  handleChildProcessError(child);

  process.exit(child.status ?? EXIT_CODE_SUCCESS);
}

function runCommandWithPrompt(
  command: string,
  prompt: string,
  useStdin = false
): SpawnSyncReturns<string | Buffer> {
  if (!isSafeCommand(command)) {
    console.error("Invalid command format");
    process.exit(1);
  }

  const parsedCommand = parseCommand(command);
  if (!parsedCommand.cmd) {
    console.error("Empty command");
    process.exit(1);
  }

  if (useStdin) {
    return spawnSync(parsedCommand.cmd, parsedCommand.args, {
      input: prompt,
      stdio: ["pipe", "pipe", "inherit"],
      shell: false,
      encoding: "utf-8",
    }) as SpawnSyncReturns<string | Buffer>;
  }

  return spawnSync(parsedCommand.cmd, [...parsedCommand.args, prompt], {
    stdio: ["inherit", "pipe", "inherit"],
    shell: false,
    encoding: "utf-8",
  }) as SpawnSyncReturns<string | Buffer>;
}

function launchToolWithPrompt(
  command: string,
  prompt: string,
  useStdin = false,
  outputFile?: string
): never {
  if (outputFile) {
    const validationError = validateOutputFile(outputFile);
    if (validationError) {
      console.error(`Error: ${validationError}`);
      process.exit(EXIT_CODE_VALIDATION_ERROR);
    }

    const resolvedPath = resolve(outputFile);
    const outputDir = dirname(resolvedPath);

    if (!existsSync(outputDir)) {
      console.error(`Error: Output directory does not exist: ${outputDir}`);
      process.exit(EXIT_CODE_VALIDATION_ERROR);
    }

    const child = runCommandWithPrompt(command, prompt, useStdin);
    handleChildProcessError(child);

    const output = child.stdout || "";

    try {
      writeFileSync(resolvedPath, output);
      const fileSize = Buffer.byteLength(output, "utf-8");
      console.log(`\n✅ Analysis saved to: ${resolvedPath} (${fileSize} bytes)`);
    } catch (error) {
      console.error(`\n❌ Failed to write output to ${resolvedPath}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(EXIT_CODE_FILE_WRITE_ERROR);
    }

    process.exit(child.status ?? EXIT_CODE_SUCCESS);
  }

  const child = runCommandWithPrompt(command, prompt, useStdin);
  handleChildProcessError(child);

  if (child.stdout) {
    process.stdout.write(child.stdout);
  }

  process.exit(child.status ?? 0);
}

async function confirmPrompt(message: string): Promise<boolean> {
  const answer = await promptForInput(message);
  return /^(y|yes)$/i.test(answer.trim());
}

async function routeNaturalLanguageTask(
  request: string,
  stdinContent: string | null,
  config: Awaited<ReturnType<typeof loadConfig>>
): Promise<void> {
  if (!config.router) {
    console.error(`No tool or template found matching '${request}'`);
    process.exit(1);
  }

  const routingPrompt = buildRouterPrompt(request, config.templates, stdinContent ?? undefined);
  const routerResult = runCommandWithPrompt(
    config.router.command,
    routingPrompt,
    config.router.promptUseStdin ?? false
  );
  handleChildProcessError(routerResult);

  if ((routerResult.status ?? 0) !== 0) {
    console.error(`Router command failed with exit code ${routerResult.status ?? "unknown"}`);
    process.exit(routerResult.status ?? 1);
  }

  const rawOutput = String(routerResult.stdout ?? "").trim();
  const selection = parseRouterResponse(rawOutput);
  if (!selection) {
    console.error("Router did not return valid JSON selection");
    process.exit(1);
  }

  const resolved = resolveRouterSelection(selection, config.templates);
  if (!resolved) {
    console.error(`Router selected unknown template '${selection.template}'`);
    process.exit(1);
  }

  if (resolved.requiresConfirmation) {
    console.log(`\nSelected template: ${resolved.template.name}`);
    console.log(
      `Preview: ${resolved.template.command.replace("$@", selection.arguments.join(" "))}`
    );
    const isConfirmed = await confirmPrompt("This template may modify files. Continue? [y/N] ");
    if (!isConfirmed) {
      process.exit(0);
    }
  }

  launchTool(resolved.template.command, selection.arguments, stdinContent);
}

async function confirmTemplateExecution(item: SelectableItem, args: string[]): Promise<boolean> {
  if (!item.isTemplate) {
    return true;
  }

  const templateLike: Template = {
    name: item.name,
    command: item.command,
    description: item.description,
    aliases: item.aliases,
    mode: item.mode,
    requiresConfirmation: item.requiresConfirmation,
  };

  if (templateRequiresConfirmation(templateLike)) {
    console.log(`\nSelected template: ${item.name}`);
    const previewCmd = item.command.includes("$@")
      ? item.command.replace("$@", args.join(" "))
      : args.length > 0
        ? `${item.command} ${args.join(" ")}`
        : item.command;
    console.log(`Preview: ${previewCmd}`);
    return await confirmPrompt("This template may modify files. Continue? [y/N] ");
  }

  return true;
}

async function main() {
  const args = process.argv.slice(2);

  // Handle --help, --version, and upgrade before loading config
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

  const stdinContent = readStdin();

  const config = loadConfig();
  const detectedTools = detectInstalledTools();
  const allTools = mergeTools(config.tools, detectedTools);

  const items = toSelectableItems(allTools, config.templates);
  const lookupItems = items;

  if (items.length === 0) {
    console.error("❌ No AI tools found!\n");
    console.error("💡 Install one or more of these tools:");
    for (const line of formatSuggestedInstallHints()) {
      console.error(line);
    }
    console.error("\n📝 Or add custom tools to ~/.config/ai-launcher/config.json");
    process.exit(1);
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

  const parsedArgs = parseArgs(args);

  if (parsedArgs.dashSeparator) {
    const beforeDash = parsedArgs.beforeDash;
    const afterDash = parsedArgs.afterDash;

    if (beforeDash.length === 0) {
      const result = await fuzzySelect(items);
      if (result.cancelled) {
        process.exit(0);
      }
      if (result.item) {
        if (result.item.isTemplate) {
          const isConfirmed = await confirmTemplateExecution(result.item, afterDash);
          if (!isConfirmed) {
            process.exit(0);
          }
        }
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
      if (lookupResult.item.isTemplate) {
        const isConfirmed = await confirmTemplateExecution(lookupResult.item, afterDash);
        if (!isConfirmed) {
          process.exit(0);
        }
      }
      launchTool(lookupResult.item.command, afterDash, stdinContent);
      return;
    }
    console.error(lookupResult.error);
    process.exit(1);
  }

  if (args.length > 0) {
    const toolQuery = parsedArgs.toolQuery;
    if (!toolQuery) {
      console.error("No tool query found");
      process.exit(1);
    }
    const extraArgs = parsedArgs.extraArgs;

    const result = findToolByName(toolQuery, lookupItems);

    if (result.success && result.item) {
      if (result.item.isTemplate) {
        const isConfirmed = await confirmTemplateExecution(result.item, extraArgs);
        if (!isConfirmed) {
          process.exit(0);
        }
      }
      launchTool(result.item.command, extraArgs, stdinContent);
      return;
    }

    if (config.router) {
      await routeNaturalLanguageTask(args.join(" "), stdinContent, config);
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
    if (result.item.isTemplate) {
      let argsToUse: string[] = [];
      if (result.item.command.includes("$@")) {
        console.log(`\nSelected: ${result.item.name}`);
        const input = await promptForInput(`Enter arguments for "${result.item.name}": `);
        if (input.length === 0) {
          process.exit(0);
        }
        argsToUse = [input];
      }
      const isConfirmed = await confirmTemplateExecution(result.item, argsToUse);
      if (!isConfirmed) {
        process.exit(0);
      }
      const finalCommand = result.item.command.includes("$@")
        ? result.item.command.replace("$@", argsToUse[0] ?? "")
        : result.item.command;
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
