import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectCategory, getModeInstruction } from "./detect.ts";
import { fetchUrlContent, resolveInput, SummaryInputError, SummaryUrlError } from "./input.ts";
import { renderJson, renderMarkdown } from "./output.ts";
import { extractJson } from "./parse-json.ts";
import { buildSummaryPrompt } from "./prompts.ts";
import type { Summary } from "./schema.ts";
import { parseSummary } from "./schema.ts";

describe("summary module", () => {
  describe("detectCategory", () => {
    test("detects email from headers", () => {
      const content = `From: sender@example.com\nTo: team@example.com\nSubject: Update\n\nHi team,`;
      expect(detectCategory(content)).toBe("email");
    });

    test("detects newsletter from keywords", () => {
      const content = `This week in AI: the latest models. Unsubscribe at the bottom.`;
      expect(detectCategory(content)).toBe("newsletter");
    });

    test("defaults to unknown for plain content", () => {
      const content = `The quick brown fox jumps over the lazy dog. This is a plain article.`;
      expect(detectCategory(content)).toBe("unknown");
    });
  });

  describe("getModeInstruction", () => {
    test("actions mode includes deadlines and tasks", () => {
      const instruction = getModeInstruction("actions");
      expect(instruction).toContain("deadlines");
      expect(instruction).toContain("action_items");
    });

    test("linkedin mode includes LinkedIn post", () => {
      const instruction = getModeInstruction("linkedin");
      expect(instruction).toContain("LinkedIn");
    });

    test("technical mode preserves technical details", () => {
      const instruction = getModeInstruction("technical");
      expect(instruction).toContain("technical");
      expect(instruction).toContain("code snippets");
    });
  });

  describe("buildSummaryPrompt", () => {
    test("includes mode instructions and content", () => {
      const prompt = buildSummaryPrompt({
        content: "The article content",
        category: "article",
        mode: "tldr",
        source: "article.txt",
      });
      expect(prompt).toContain("The article content");
      expect(prompt).toContain("tldr:");
      expect(prompt).toContain("article.txt");
    });
  });

  describe("parseSummary", () => {
    test("validates a valid summary object", () => {
      const summary = parseSummary({
        title: "Test",
        summary: "A short summary",
        key_points: ["One", "Two"],
        action_items: ["Reply"],
        category: "email",
        importance: "high",
      });
      expect(summary.title).toBe("Test");
      expect(summary.importance).toBe("high");
    });

    test("rejects an invalid summary object", () => {
      expect(() =>
        parseSummary({
          summary: 123,
          category: "invalid",
          importance: "medium",
        })
      ).toThrow();
    });
  });

  describe("extractJson", () => {
    test("parses plain JSON", () => {
      const result = extractJson('  {"summary": "hello"}  ');
      expect(result).toEqual({ summary: "hello" });
    });

    test("extracts JSON from markdown fences", () => {
      const result = extractJson('```json\n{"summary": "hello"}\n```');
      expect(result).toEqual({ summary: "hello" });
    });

    test("extracts JSON from surrounding text", () => {
      const result = extractJson('Here is the JSON: {"summary": "hello"} Done.');
      expect(result).toEqual({ summary: "hello" });
    });

    test("extracts JSON when prose contains braces", () => {
      const result = extractJson('Here is the result {as requested}: {"summary": "hello"}. Done!');
      expect(result).toEqual({ summary: "hello" });
    });

    test("throws when no JSON is found", () => {
      expect(() => extractJson("no json here")).toThrow();
    });
  });

  describe("renderMarkdown", () => {
    test("renders summary as markdown", () => {
      const markdown = renderMarkdown({
        title: "My Title",
        summary: "A concise summary.",
        key_points: ["Point one"],
        action_items: ["Action one"],
        category: "article",
        importance: "medium",
      });
      expect(markdown).toContain("# My Title");
      expect(markdown).toContain("A concise summary.");
      expect(markdown).toContain("- Point one");
      expect(markdown).toContain("- [ ] Action one");
      expect(markdown).toContain("Category: article");
    });
  });

  describe("renderJson", () => {
    test("renders summary as JSON", () => {
      const summary: Summary = {
        title: "My Title",
        summary: "A concise summary.",
        key_points: ["Point one"],
        action_items: ["Action one"],
        category: "article",
        importance: "medium",
      };
      const json = renderJson(summary);
      expect(JSON.parse(json)).toEqual(summary);
    });
  });

  describe("resolveInput", () => {
    let tempDir: string;
    let tempFile: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "ai-summary-"));
      tempFile = join(tempDir, "test.txt");
    });

    afterEach(() => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    });

    test("reads a file when given a path", async () => {
      writeFileSync(tempFile, "File content here", "utf-8");
      const result = await resolveInput([tempFile]);
      expect(result.content).toBe("File content here");
      expect(result.source).toBe(tempFile);
    });

    test("treats plain text as an argument", async () => {
      const result = await resolveInput(["Hello", "world"]);
      expect(result.content).toBe("Hello world");
      expect(result.source).toBe("argument");
    });

    test("throws when no input is provided", async () => {
      await expect(resolveInput([])).rejects.toBeInstanceOf(SummaryInputError);
    });
  });

  describe("fetchUrlContent", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    function mockFetch(response: {
      status: number;
      statusText: string;
      text: string;
      contentType?: string;
    }) {
      globalThis.fetch = (async () =>
        new Response(response.text, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers([["content-type", response.contentType ?? "text/plain"]]),
        })) as unknown as typeof globalThis.fetch;
    }

    test("fetches plain text URL", async () => {
      mockFetch({ status: 200, statusText: "OK", text: "Plain text article" });
      const result = await fetchUrlContent("https://example.com/article");
      expect(result.content).toBe("Plain text article");
      expect(result.source).toBe("https://example.com/article");
    });

    test("extracts text from HTML URL", async () => {
      mockFetch({
        status: 200,
        statusText: "OK",
        contentType: "text/html",
        text: "<html><body><p>Hello <b>world</b></p></body></html>",
      });
      const result = await fetchUrlContent("https://example.com/article");
      expect(result.content).toContain("Hello world");
    });

    test("throws on failed fetch", async () => {
      mockFetch({ status: 404, statusText: "Not Found", text: "Not found" });
      await expect(fetchUrlContent("https://example.com/missing")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
    });

    test("rejects private URLs before fetching", async () => {
      globalThis.fetch = (() => {
        throw new Error("fetch should not be called for private URLs");
      }) as unknown as typeof globalThis.fetch;

      await expect(fetchUrlContent("http://127.0.0.1/secret")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
      await expect(fetchUrlContent("http://localhost/secret")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
      await expect(fetchUrlContent("http://169.254.169.254/")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
    });

    test("rejects alternative IPv4 representations", async () => {
      globalThis.fetch = (() => {
        throw new Error("fetch should not be called for private URLs");
      }) as unknown as typeof globalThis.fetch;

      await expect(fetchUrlContent("http://2130706433/secret")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
      await expect(fetchUrlContent("http://0x7f000001/secret")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
      await expect(fetchUrlContent("http://0/secret")).rejects.toBeInstanceOf(SummaryUrlError);
      await expect(fetchUrlContent("http://2852039166/")).rejects.toBeInstanceOf(SummaryUrlError);
      await expect(fetchUrlContent("http://0x7f.0.0.1/secret")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
    });

    test("rejects URLs with content length over the limit", async () => {
      globalThis.fetch = (async () =>
        new Response("ignored", {
          headers: new Headers([
            ["content-type", "text/plain"],
            ["content-length", "1000001"],
          ]),
        })) as unknown as typeof globalThis.fetch;

      await expect(fetchUrlContent("https://example.com/huge")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
    });

    test("fetches URL via streaming response body", async () => {
      globalThis.fetch = (async () =>
        new Response(new TextEncoder().encode("Plain text from stream"), {
          headers: new Headers([["content-type", "text/plain"]]),
        })) as unknown as typeof globalThis.fetch;

      const result = await fetchUrlContent("https://example.com/article");
      expect(result.content).toBe("Plain text from stream");
      expect(result.source).toBe("https://example.com/article");
    });

    test("rejects streaming URL when body exceeds the size limit", async () => {
      const largeBody = new Uint8Array(1_000_001).fill(0x78);
      globalThis.fetch = (async () =>
        new Response(largeBody, {
          headers: new Headers([["content-type", "text/plain"]]),
        })) as unknown as typeof globalThis.fetch;

      await expect(fetchUrlContent("https://example.com/huge")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
    });

    test("rejects redirect to a private URL", async () => {
      globalThis.fetch = (async () =>
        new Response(null, {
          status: 302,
          headers: new Headers([["location", "http://127.0.0.1/secret"]]),
        })) as unknown as typeof globalThis.fetch;

      await expect(fetchUrlContent("https://example.com/redirect")).rejects.toBeInstanceOf(
        SummaryUrlError
      );
    });

    test("follows public redirects and fetches content", async () => {
      globalThis.fetch = (async (input: string | Request | URL) => {
        const url = input.toString();
        if (url === "https://example.com/redirect") {
          return new Response(null, {
            status: 302,
            headers: new Headers([["location", "https://example.com/article"]]),
          });
        }
        return new Response("Final content", {
          headers: new Headers([["content-type", "text/plain"]]),
        });
      }) as unknown as typeof globalThis.fetch;

      const result = await fetchUrlContent("https://example.com/redirect");
      expect(result.content).toBe("Final content");
      expect(result.source).toBe("https://example.com/redirect");
    });
  });
});
