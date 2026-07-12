#!/usr/bin/env bun

import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import { existsSync, readSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { executeDiffCommand, parseDiffArgs } from "./cli/diff";
import { loadConfig } from "./config";
import { detectInstalledTools, formatSuggestedInstallHints, mergeTools } from "./detect";
import { fuzzySelect, promptForInput, toSelectableItems } from "./fuzzy-select";
import { getColoredLogo } from "./logo";
import { findToolByName } from "./lookup";
import { isSafeCommand } from "./template";
import { upgrade } from "./upgrade";
import { type OutputPathRejection, checkOutputPath, validateArguments } from "./validators";
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

const OUTPUT_PATH_REASON_MESSAGES: Record<OutputPathRejection, string> = {
  absolute: "Output file path must be relative, not absolute",
  escape: "Output file path cannot escape the current directory",
  hidden: "Output file path cannot point to a hidden file or directory",
  protected: "Output file path points to a protected location",
};

function validateOutputFile(filePath: string): string | null {
  if (!filePath || filePath.trim().length === 0) {
    return "Output file path cannot be empty";
  }

  const pathCheck = checkOutputPath(filePath);
  if (!pathCheck.ok) {
    return OUTPUT_PATH_REASON_MESSAGES[pathCheck.reason];
  }

  const resolvedPath = resolve(filePath);

  if (existsSync(resolvedPath)) {
    console.error(`Warning: File already exists: ${resolvedPath}`);
    console.error("Use a different filename or remove the existing file first");
    return "File already exists";
  }

  return null;
}

// Cap stdin so a huge pipe (e.g. `cat huge.bin | ai template`) cannot OOM the
// launcher before it ever reaches the child process.
const MAX_STDIN_SIZE = 10 * 1024 * 1024;

function readStdin(): string | null {
  const isInteractive = process.stdin.isTTY;
  if (isInteractive) return null;

  // Read fd 0 incrementally so an oversized pipe is aborted *before* the whole
  // payload is buffered into memory, rather than after.
  const CHUNK_SIZE = 64 * 1024;
  const buffer = Buffer.alloc(CHUNK_SIZE);
  const chunks: Buffer[] = [];
  let total = 0;

  // If stdin is non-blocking and not ready, readSync throws EAGAIN. Back off
  // briefly between retries (rather than busy-spinning a core) and give up
  // after a bounded wait, treating it as "no stdin" like the old best-effort
  // readFileSync behavior.
  const EAGAIN_BACKOFF_MS = 5;
  const MAX_EAGAIN_RETRIES = 2000; // ~10s of retries before giving up
  const sleepSlot = new Int32Array(new SharedArrayBuffer(4));
  let eagainRetries = 0;

  while (true) {
    let bytesRead: number;
    try {
      bytesRead = readSync(0, buffer, 0, CHUNK_SIZE, null);
      eagainRetries = 0;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EAGAIN") {
        if (++eagainRetries > MAX_EAGAIN_RETRIES) return null;
        Atomics.wait(sleepSlot, 0, 0, EAGAIN_BACKOFF_MS);
        continue;
      }
      if (code === "EOF") break; // Windows signals end-of-input this way
      return null;
    }

    if (bytesRead === 0) break;

    total += bytesRead;
    if (total > MAX_STDIN_SIZE) {
      console.error(
        `Error: stdin input exceeds ${MAX_STDIN_SIZE / 1024 / 1024}MB limit and was rejected.`
      );
      process.exit(1);
    }

    chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
  }

  return Buffer.concat(chunks).toString("utf-8").trim();
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

  handleChildProcessError(child);

  process.exit(child.status ?? EXIT_CODE_SUCCESS);
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
