import { existsSync, readFileSync } from "node:fs";

export const MAX_CONTENT_LENGTH = 12_000;

export interface ResolvedInput {
  content: string;
  source: string;
}

export class SummaryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SummaryInputError";
  }
}

export class SummaryUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SummaryUrlError";
  }
}

function trimContent(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return content;
  }
  return content.slice(0, MAX_CONTENT_LENGTH).trimEnd();
}

function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractTextFromHtml(html: string): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return trimContent(text);
}

export async function fetchUrlContent(url: string): Promise<ResolvedInput> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "ai-summary/1.0 (https://github.com/jellydn/ai-launcher)",
        Accept: "text/html, text/plain, */*",
      },
    });
  } catch (error) {
    throw new SummaryUrlError(
      `Failed to fetch URL: ${error instanceof Error ? error.message : error}`
    );
  }

  if (!response.ok) {
    throw new SummaryUrlError(`URL returned ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (raw.length === 0) {
    throw new SummaryUrlError("Fetched URL returned empty content");
  }

  const isHtml =
    contentType.includes("html") ||
    raw.trim().toLowerCase().startsWith("<!doctype html") ||
    raw.includes("<html");
  const content = isHtml ? extractTextFromHtml(raw) : trimContent(raw);

  return { content, source: url };
}

function readFileContent(filePath: string): ResolvedInput {
  try {
    const content = readFileSync(filePath, "utf-8");
    if (content.trim().length === 0) {
      throw new SummaryInputError(`File is empty: ${filePath}`);
    }
    return { content: trimContent(content.trim()), source: filePath };
  } catch (error) {
    if (error instanceof SummaryInputError) {
      throw error;
    }
    throw new SummaryInputError(
      `Failed to read file: ${error instanceof Error ? error.message : error}`
    );
  }
}

function readStdinContent(): string | null {
  if (process.stdin.isTTY) {
    return null;
  }

  try {
    const content = readFileSync(0, "utf-8");
    return content.trim();
  } catch {
    return null;
  }
}

export async function resolveInput(input?: string[]): Promise<ResolvedInput> {
  if (input && input.length > 0) {
    const first = input[0];
    if (!first) {
      throw new SummaryInputError("No input provided");
    }

    if (first === "-") {
      const stdin = readStdinContent();
      if (!stdin) {
        throw new SummaryInputError("No input provided via stdin");
      }
      return { content: trimContent(stdin), source: "stdin" };
    }

    if (looksLikeUrl(first)) {
      return fetchUrlContent(first);
    }

    if (input.length === 1 && existsSync(first)) {
      return readFileContent(first);
    }

    const content = input.join(" ").trim();
    if (content.length === 0) {
      throw new SummaryInputError("No input provided");
    }
    return { content: trimContent(content), source: "argument" };
  }

  const stdin = readStdinContent();
  if (!stdin) {
    throw new SummaryInputError("No input provided");
  }
  return { content: trimContent(stdin), source: "stdin" };
}
