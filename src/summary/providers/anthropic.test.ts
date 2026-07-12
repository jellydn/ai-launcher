import { describe, expect, test } from "bun:test";
import { AnthropicProvider } from "./anthropic.ts";

function createSseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    statusText: "OK",
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("AnthropicProvider", () => {
  test("streams text_delta chunks", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      createSseResponse([
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}',
      ])) as unknown as typeof fetch;

    try {
      const provider = new AnthropicProvider({ apiKey: "test-key" });
      const chunks: string[] = [];
      for await (const chunk of provider.generate({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello" },
        ],
        temperature: 0.1,
      })) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(["Hello ", "world"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws ProviderError on API error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "invalid request" }), {
        status: 400,
        statusText: "Bad Request",
      })) as unknown as typeof fetch;

    try {
      const provider = new AnthropicProvider({ apiKey: "test-key" });
      const generator = provider.generate({
        messages: [{ role: "user", content: "prompt" }],
        temperature: 0.1,
      });
      await expect(generator.next()).rejects.toBeInstanceOf(Error);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
