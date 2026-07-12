import { closeSync, existsSync, openSync, readFileSync, readSync } from "node:fs";

export const MAX_CONTENT_LENGTH = 12_000;

const MAX_DOWNLOAD_SIZE = 1_000_000;

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

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "localhost.localdomain";
}

function isDottedDecimalIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255 && part === String(num);
  });
}

function normalizeIpv4(hostname: string): string | null {
  if (hostname.includes(":")) return null;
  if (isDottedDecimalIpv4(hostname)) return hostname;
  try {
    const parsed = new URL(`http://${hostname}`);
    return isDottedDecimalIpv4(parsed.hostname) ? parsed.hostname : null;
  } catch {
    return null;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const normalized = isDottedDecimalIpv4(hostname) ? hostname : normalizeIpv4(hostname);
  if (!normalized) return false;

  const parts = normalized.split(".").map(Number);
  const [a, b] = parts;
  if (a === undefined || b === undefined) return false;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80")) return true;
  if (lower.startsWith("ff")) return true;
  if (lower.startsWith("::ffff:")) {
    return isPrivateIpv4(lower.slice(7));
  }
  return false;
}

function isMetadataHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "metadata") return true;
  if (lower === "metadata.google.internal") return true;
  if (lower.endsWith(".metadata.google.internal")) return true;
  return false;
}

function isPrivateHost(hostname: string): boolean {
  return (
    isLocalHost(hostname) ||
    isMetadataHost(hostname) ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  );
}

function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SummaryUrlError("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SummaryUrlError("Only HTTP and HTTPS URLs are supported");
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new SummaryUrlError("URL points to a private, local, or metadata address");
  }
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

async function readResponseWithLimit(response: Response, limit: number): Promise<string> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > limit) {
      throw new SummaryUrlError(`URL content exceeds ${limit} bytes`);
    }
  }

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let bytesRead = 0;
  let done = false;
  let value: Uint8Array | undefined;
  let limitExceeded = false;

  try {
    while (true) {
      ({ done, value } = await reader.read());
      if (done) break;
      if (value) {
        raw += decoder.decode(value, { stream: true });
        bytesRead += value.length;
      }
      if (bytesRead > limit) {
        limitExceeded = true;
        break;
      }
    }
  } finally {
    if (!done) {
      await reader.cancel();
    }
    raw += decoder.decode();
  }

  if (limitExceeded) {
    throw new SummaryUrlError(`URL content exceeds ${limit} bytes`);
  }

  return raw;
}

export async function fetchUrlContent(url: string): Promise<ResolvedInput> {
  validateUrl(url);

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
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

  const finalUrl = response.url || url;
  validateUrl(finalUrl);

  const contentType = response.headers.get("content-type") ?? "";
  const raw = await readResponseWithLimit(response, MAX_DOWNLOAD_SIZE);

  if (raw.length === 0) {
    throw new SummaryUrlError("Fetched URL returned empty content");
  }

  const isHtml =
    contentType.toLowerCase().includes("html") ||
    raw.trim().toLowerCase().startsWith("<!doctype html") ||
    raw.toLowerCase().includes("<html");
  const content = isHtml ? extractTextFromHtml(raw) : trimContent(raw);

  if (content.trim().length === 0) {
    throw new SummaryUrlError("Fetched URL returned empty content after extraction");
  }

  return { content, source: url };
}

function readFileWithLimit(filePath: string, limit: number): string {
  const fd = openSync(filePath, "r");
  const buffer = Buffer.alloc(limit);
  let bytesRead = 0;
  try {
    bytesRead = readSync(fd, buffer, 0, limit, 0);
  } finally {
    closeSync(fd);
  }

  const chunk = buffer.subarray(0, bytesRead);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(chunk);
}

function readFileContent(filePath: string): ResolvedInput {
  try {
    const content = readFileWithLimit(filePath, MAX_DOWNLOAD_SIZE);
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
