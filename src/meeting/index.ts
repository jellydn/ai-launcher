#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import type { MeetingSummary } from "./schema.ts";
import { summarizeMeeting } from "./summarize.ts";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const MIN_TEMPERATURE = 0.0;
const MAX_TEMPERATURE = 2.0;

export interface MeetingOptions {
  path: string | undefined;
  json: boolean;
  progress: boolean;
  openrouter: boolean;
  baseURL: string | undefined;
  model: string | undefined;
  temperature: number | undefined;
}

interface MeetingConfig {
  apiKey: string;
  baseURL: string | undefined;
  model: string | undefined;
  temperature: number | undefined;
}

function showHelp(): never {
  console.log(`ai meeting
Extract summaries, action items, and risks from meeting notes.

Usage:
  ai meeting <path-to-meeting-notes.md>
  cat meeting.md | ai meeting
  cat meeting.md | ai meeting --json
  cat meeting.md | ai meeting --model gpt-4o --temperature 0.2

OpenRouter (cost-free dev/test):
  ai meeting meeting.md --openrouter
  OPENROUTER_API_KEY=... ai meeting meeting.md --openrouter --model openai/gpt-4o
  ai meeting meeting.md --base-url https://openrouter.ai/api/v1 --model google/gemini-2.0-flash-exp:free

Options:
  -h, --help              Show this help
  --json                  Output only structured JSON
  --progress              Show the raw JSON stream as it arrives
  --openrouter            Use OpenRouter (sets base URL and free-model default)
  --base-url <url>        OpenAI-compatible API base URL
  --model <model>         Model to use
  --temperature <n>       Sampling temperature (0.0-2.0)
`);
  process.exit(0);
}

function requireOptionValue(
  args: string[],
  index: number,
  flag: string,
  allowLeadingDash = false
): { value: string; nextIndex: number } {
  const next = args[index + 1];
  if (!next || next.startsWith("--") || (!allowLeadingDash && next.startsWith("-"))) {
    throw new Error(`${flag} requires a value`);
  }
  return { value: next, nextIndex: index + 1 };
}

function parseTemperatureValue(value: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    throw new Error("--temperature must be a finite number");
  }
  if (parsed < MIN_TEMPERATURE || parsed > MAX_TEMPERATURE) {
    throw new Error(`--temperature must be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}`);
  }
  return parsed;
}

export function parseArgs(args: string[]): MeetingOptions {
  let path: string | undefined;
  let json = false;
  let progress = false;
  let openrouter = false;
  let baseURL: string | undefined;
  let model: string | undefined;
  let temperature: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) {
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      showHelp();
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--progress") {
      progress = true;
    } else if (arg === "--openrouter") {
      openrouter = true;
    } else if (arg === "--base-url") {
      const result = requireOptionValue(args, i, "--base-url");
      baseURL = result.value;
      i = result.nextIndex;
    } else if (arg === "--model") {
      const result = requireOptionValue(args, i, "--model");
      model = result.value;
      i = result.nextIndex;
    } else if (arg === "--temperature") {
      const result = requireOptionValue(args, i, "--temperature", true);
      temperature = parseTemperatureValue(result.value);
      i = result.nextIndex;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      path = arg;
    }
  }

  return { path, json, progress, openrouter, baseURL, model, temperature };
}

function readInput(path: string | undefined): string {
  if (path) {
    return readFileSync(path, "utf-8");
  }
  if (process.stdin.isTTY) {
    showHelp();
  }
  return readFileSync(0, "utf-8");
}

export function resolveProviderConfig(options: MeetingOptions): MeetingConfig {
  let baseURL = options.baseURL ?? process.env.OPENAI_BASE_URL;

  const isOpenRouterBaseURL = baseURL?.includes("openrouter.ai") ?? false;
  const shouldUseOpenRouter = options.openrouter || isOpenRouterBaseURL;

  if (shouldUseOpenRouter && !baseURL) {
    baseURL = OPENROUTER_BASE_URL;
  }

  let apiKey: string | undefined;
  if (options.openrouter) {
    apiKey = process.env.OPENROUTER_API_KEY;
  } else if (isOpenRouterBaseURL) {
    apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
  } else {
    apiKey = process.env.OPENAI_API_KEY;
  }

  if (!apiKey) {
    if (options.openrouter) {
      throw new Error("OPENROUTER_API_KEY is not set.");
    }
    if (isOpenRouterBaseURL) {
      throw new Error("OPENAI_API_KEY or OPENROUTER_API_KEY is not set.");
    }
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const model = options.model ?? (shouldUseOpenRouter ? DEFAULT_OPENROUTER_MODEL : undefined);

  return { apiKey, baseURL, model, temperature: options.temperature };
}

export function renderSummary(result: MeetingSummary): string {
  const lines: string[] = [];
  lines.push(`Summary\n${result.summary}\n`);
  lines.push("Action items");

  if (result.action_items.length === 0) {
    lines.push("  None");
  }

  for (const item of result.action_items) {
    lines.push(`- ${item.task} — ${item.owner} (due ${item.due})`);
  }

  lines.push("");
  lines.push("Risks");

  if (result.risks.length === 0) {
    lines.push("  None");
  }

  for (const risk of result.risks) {
    lines.push(`- ${risk}`);
  }

  return lines.join("\n");
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const input = readInput(options.path).trim();

  if (input.length === 0) {
    console.error("No meeting notes provided.");
    process.exit(1);
  }

  const config = resolveProviderConfig(options);

  let streamed = false;
  const result = await summarizeMeeting(input, {
    ...config,
    onChunk: (chunk) => {
      if (!options.progress) {
        return;
      }
      process.stderr.write(chunk);
      streamed = true;
    },
  });

  if (streamed) {
    process.stderr.write("\n");
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(renderSummary(result));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
