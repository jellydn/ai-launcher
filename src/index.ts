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
import { findToolByName, type LookupResult } from "./lookup";
import { main as meetingMain } from "./meeting/index.ts";
import { formatPromptInspection, formatPromptList } from "./prompts/registry.ts";
import { main as summaryMain } from "./summary/index.ts";
import { buildTemplateCommand, isSafeCommand, parseTemplateCommand } from "./template";
import type { SelectableItem } from "./types";
import { upgrade } from "./upgrade";
import {
  checkOutputPath,
  MAX_STDIN_BYTES,
  type OutputPathRejection,
  validateArguments,
} from "./validators";
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
    console.error(`Error: ${OUTPUT_PATH_REASON_MESSAGES[pathCheck.reason]}`);
    return "Invalid output file path";
  }

  const resolvedPath = resolve(filePath);

  if (existsSync(resolvedPath)) {
    console.error(`Warning: File already exists: ${resolvedPath}`);
    console.error("Use a different filename or remove the existing file first");
    return "File already exists";
  }

  return null;
}

// Cap stdin so a huge pipe cannot OOM the launcher. Read fd 0 in chunks and
// abort as soon as the cumulative size exceeds the limit (do not buffer first).
function readStdin(): string | null {
  if (process.stdin.isTTY) return null;

  const CHUNK_SIZE = 64 * 1024;
  const buffer = Buffer.alloc(CHUNK_SIZE);
  const chunks: Buffer[] = [];
  let total = 0;

  // Non-blocking stdin may throw EAGAIN. Back off briefly and give up after a
  // bounded wait rather than busy-spinning a core.
  const EAGAIN_BACKOFF_MS = 5;
  const MAX_EAGAIN_RETRIES = 2000; // ~10s
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
      if (code === "EOF") break;
      return null;
    }

    if (bytesRead === 0) break;

    total += bytesRead;
    if (total > MAX_STDIN_BYTES) {
      console.error(
        `Error: stdin input exceeds ${MAX_STDIN_BYTES / 1024 / 1024}MB limit and was rejected.`
      );
      process.exit(EXIT_CODE_VALIDATION_ERROR);
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

BUILT-IN:
    summary                          Summarize files, URLs, or stdin (see: ai summary --help)
    meeting                          Extract summary, actions, risks from notes (see: ai meeting --help)
    prompt list                      List reusable prompt templates
    prompt inspect <id>              Inspect a prompt's variables and output

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
    ai summary article.txt           Summarize a file (default template uses OpenCode)
    ai summary README.md -p opencode Summarize with OpenCode CLI
    cat email.txt | ai summary -m actions
                                     Pull action items from stdin
    ai meeting notes.md              Structure meeting notes (needs OPENAI_API_KEY)
    ai meeting notes.md --openrouter Use OpenRouter (OPENROUTER_API_KEY)
    cat transcript.md | ai meeting --json
                                     JSON: summary, action_items, risks
    ai prompt list                   List prompt IDs and versions
    ai prompt inspect extract-meeting
                                     Inspect the meeting extraction prompt
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

  // When stdin is used without CLI args, treat it as the sole $@ substitution value.
  const templateArgs = hasArgs ? extraArgs : hasStdin ? [stdinContent as string] : [];
  let finalCommand: string;
  try {
    finalCommand = buildTemplateCommand(command, templateArgs);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

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
      // Prefer argv append so Windows builds do not require `sh`.
      // Tools that need a single shell-quoted prompt still work via shell:true.
      child = spawnSync(cmd, [...args, prompt], {
        stdio: ["inherit", "pipe", "inherit"],
        shell: true,
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

  // Pass prompt as a final argv element instead of `sh -c` so Windows works
  // and shell metacharacters in the prompt are not re-parsed by a shell.
  const child = spawnSync(cmd, [...args, prompt], {
    stdio: "inherit",
    shell: true,
  }) as SpawnSyncReturns<string | Buffer>;

  handleChildProcessError(child);

  process.exit(child.status ?? 0);
}

function isSummaryTemplate(item: SelectableItem): boolean {
  if (!item.isTemplate) {
    return false;
  }
  return /^ai summary(?:\s|$)/.test(item.command.trim());
}

function getSummaryArgsFromTemplate(command: string, userArgs: string[]): string[] {
  const parsed = parseTemplateCommand(command);
  const summaryIndex = parsed.args.indexOf("summary");
  const placeholderIndex = parsed.args.indexOf("$@");
  const endIndex = placeholderIndex === -1 ? parsed.args.length : placeholderIndex;
  const flagArgs = parsed.args.slice(summaryIndex + 1, endIndex);
  const strippedFlags = flagArgs.map((token) => token.replace(/^["']|["']$/g, ""));
  return [...strippedFlags, ...userArgs];
}

const PROMPT_ID_PATTERN = /^[a-z0-9-]+$/;

export function runPromptCommand(args: string[]): { success: boolean; error?: string } {
  if (args[0] === "list") {
    console.log(formatPromptList());
    return { success: true };
  }

  if (args[0] === "inspect" && args[1]) {
    if (!PROMPT_ID_PATTERN.test(args[1])) {
      return { success: false, error: `Invalid prompt ID format: ${args[1]}` };
    }
    const inspection = formatPromptInspection(args[1]);
    if (!inspection) {
      return { success: false, error: `Unknown prompt: ${args[1]}` };
    }
    console.log(inspection);
    return { success: true };
  }

  return { success: false, error: "Usage: ai prompt list | ai prompt inspect <id>" };
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

  if (args[0] === "summary") {
    await summaryMain(args.slice(1));
    return;
  }

  if (args[0] === "meeting") {
    await meetingMain(args.slice(1));
    return;
  }

  if (args[0] === "prompt") {
    const result = runPromptCommand(args.slice(1));
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    return;
  }

  const config = loadConfig();
  const detectedTools = detectInstalledTools();
  const allTools = mergeTools(config.tools, detectedTools);

  const items = toSelectableItems(allTools, config.templates);
  const lookupItems = items;

  const dashIndex = args.indexOf("--");
  const toolQuery = args[0] !== "--" ? args[0] : undefined;
  let cachedToolLookup: LookupResult | undefined;

  if (toolQuery) {
    const result = findToolByName(toolQuery, lookupItems);
    if (result.success && result.item && isSummaryTemplate(result.item)) {
      const userArgs = dashIndex !== -1 ? args.slice(dashIndex + 1) : args.slice(1);
      const summaryArgs = getSummaryArgsFromTemplate(result.item.command, userArgs);
      await summaryMain(summaryArgs);
      return;
    }
    if (result.success) {
      cachedToolLookup = result;
    }
  }

  if (items.length === 0) {
    console.error("❌ No AI tools found!\n");
    console.error("💡 Install one or more of these tools:");
    for (const line of formatSuggestedInstallHints()) {
      console.error(line);
    }
    console.error("\n📝 Or add custom tools to ~/.config/ai-launcher/config.json");
    process.exit(1);
  }

  const stdinContent = readStdin();

  const diffParsed = parseDiffArgs(args);
  if (diffParsed.hasDiffCommand) {
    const { options, diffFlagIndex } = diffParsed;
    if (options && diffFlagIndex !== undefined) {
      const diffContext = { args, lookupItems, fuzzySelect, items };
      await executeDiffCommand(options, diffFlagIndex, diffContext, launchToolWithPrompt);
      return;
    }
  }

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

    const query = beforeDash[0];
    if (!query) {
      console.error("No tool specified before '--' separator");
      process.exit(1);
    }

    const lookupResult = findToolByName(query, lookupItems);
    if (lookupResult.success && lookupResult.item) {
      launchTool(lookupResult.item.command, afterDash, stdinContent);
      return;
    }
    console.error(lookupResult.error);
    process.exit(1);
  }

  if (args.length > 0) {
    const query = args[0];
    const extraArgs = args.slice(1);

    const result =
      cachedToolLookup && toolQuery === query
        ? cachedToolLookup
        : findToolByName(query, lookupItems);

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
