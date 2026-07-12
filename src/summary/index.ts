#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { detectCategory } from "./detect.ts";
import { resolveInput, SummaryInputError, SummaryUrlError } from "./input.ts";
import { renderJson, renderMarkdown } from "./output.ts";
import { extractJson } from "./parse-json.ts";
import { buildSummaryPrompt } from "./prompts.ts";
import { createProvider, ProviderError } from "./provider.ts";
import type { Summary, SummaryMode } from "./schema.ts";
import { parseSummary, summaryModeSchema } from "./schema.ts";

function showHelp(): never {
  console.log(`ai summary - Tiny Content Summarizer

USAGE:
  ai summary <file|url|text> [options]
  ai summary --mode actions <email.txt>
  cat article.txt | ai summary --mode tldr

OPTIONS:
  -m, --mode <mode>       Summary mode: tldr | actions | linkedin | technical (default: tldr)
  -p, --provider <name>   LLM provider: openai | anthropic | ollama | openrouter | opencode | mock
      --api-key <key>     API key for the selected provider
      --base-url <url>    Base URL for the provider API
      --model <model>     Model name for the provider
  -j, --json              Output raw JSON instead of Markdown
  -h, --help              Show this help message

ENVIRONMENT:
  AI_SUMMARY_PROVIDER     Default provider (openai | anthropic | ollama | openrouter | opencode | mock)
  AI_SUMMARY_API_KEY      Default API key
  AI_SUMMARY_MODEL        Default model
  OPENAI_API_KEY, ANTHROPIC_API_KEY, OLLAMA_HOST, OLLAMA_MODEL, OPENROUTER_API_KEY  Provider-specific fallbacks

OPENROUTER:
  Set OPENROUTER_API_KEY and use --provider openrouter. The default model is openrouter/free,
  which routes to free models. Add :free to any model slug for the free variant.

OPENCODE:
  Use --provider opencode to run the OpenCode CLI. The default model is opencode/big-pickle
  and the default agent is plan, matching the ai tool's free option. No API key needed.
  Install the OpenCode CLI and run "opencode auth login" if required.`);
  process.exit(0);
}

function parseCliArgs(argv: string[]) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      mode: { type: "string", short: "m" },
      provider: { type: "string", short: "p" },
      "api-key": { type: "string" },
      "base-url": { type: "string" },
      model: { type: "string" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" },
    },
  });

  return { positionals, values };
}

function getMode(value: unknown): SummaryMode {
  if (!value) {
    return "tldr";
  }
  return summaryModeSchema.parse(value);
}

async function collectStream(stream: AsyncIterable<string>): Promise<string> {
  let raw = "";
  for await (const chunk of stream) {
    raw += chunk;
  }
  return raw;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { positionals, values } = parseCliArgs(argv);

  if (values.help) {
    showHelp();
  }

  const mode = getMode(values.mode);
  const provider = createProvider({
    provider: values.provider,
    apiKey: values["api-key"],
    baseUrl: values["base-url"],
    model: values.model,
  });

  const { content, source } = await resolveInput(positionals);
  const category = detectCategory(content);
  const prompt = buildSummaryPrompt({
    content,
    category,
    mode,
    source,
  });

  const stream = provider.generate({
    messages: [
      { role: "system", content: "You are a helpful summarization assistant." },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
  });

  const raw = await collectStream(stream);
  const json = extractJson(raw);

  let summary: Summary;
  try {
    summary = parseSummary(json);
  } catch (error) {
    console.error("Failed to parse summary output");
    console.error(error instanceof Error ? error.message : error);
    console.error("Raw output:");
    console.error(raw);
    process.exit(1);
  }

  if (values.json) {
    process.stdout.write(renderJson(summary));
  } else {
    process.stdout.write(`${renderMarkdown(summary)}\n`);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    if (
      error instanceof SummaryInputError ||
      error instanceof SummaryUrlError ||
      error instanceof ProviderError
    ) {
      console.error(error.message);
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exit(1);
  });
}
