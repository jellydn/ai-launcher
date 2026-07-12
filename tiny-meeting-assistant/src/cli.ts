#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import type { MeetingSummary } from "./schema.ts";
import { summarizeMeeting } from "./summarize.ts";

interface Options {
  path: string | undefined;
  json: boolean;
  progress: boolean;
  model: string | undefined;
  temperature: number | undefined;
}

function showHelp(): never {
  console.log(`tiny-meeting-assistant
Extract summaries, action items, and risks from meeting notes.

Usage:
  bun run src/cli.ts <path-to-meeting-notes.md>
  cat meeting.md | bun run src/cli.ts
  cat meeting.md | bun run src/cli.ts --json
  cat meeting.md | bun run src/cli.ts --model gpt-4o --temperature 0.2

Options:
  -h, --help          Show this help
  --json              Output only structured JSON
  --progress          Show the raw JSON stream as it arrives
  --model <model>     OpenAI model to use
  --temperature <n>   Sampling temperature (0.0-1.0)
`);
  process.exit(0);
}

function parseArgs(args: string[]): Options {
  let path: string | undefined;
  let json = false;
  let progress = false;
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
    } else if (arg === "--model") {
      const next = args[i + 1];
      if (!next) {
        throw new Error("--model requires a value");
      }
      model = next;
      i++;
    } else if (arg === "--temperature") {
      const next = args[i + 1];
      if (!next) {
        throw new Error("--temperature requires a value");
      }
      const value = Number.parseFloat(next);
      if (Number.isNaN(value)) {
        throw new Error("--temperature must be a number");
      }
      temperature = value;
      i++;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      path = arg;
    }
  }

  return { path, json, progress, model, temperature };
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

function renderSummary(result: MeetingSummary): string {
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  const input = readInput(options.path).trim();

  if (input.length === 0) {
    console.error("No meeting notes provided.");
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }

  let streamed = false;
  const result = await summarizeMeeting(input, {
    apiKey,
    model: options.model,
    temperature: options.temperature,
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
  console.log(`\nJSON\n${JSON.stringify(result, null, 2)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
