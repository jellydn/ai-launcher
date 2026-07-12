import { describe, expect, test } from "bun:test";
import { createProvider, ProviderError } from "./provider.ts";
import { AnthropicProvider } from "./providers/anthropic.ts";
import { MockProvider } from "./providers/mock.ts";
import { OllamaProvider } from "./providers/ollama.ts";
import { OpenAIProvider } from "./providers/openai.ts";

describe("provider module", () => {
  describe("createProvider", () => {
    test("creates mock provider", () => {
      const provider = createProvider({ provider: "mock" });
      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider.name).toBe("mock");
    });

    test("creates openai provider", () => {
      const provider = createProvider({ provider: "openai", apiKey: "test-key" });
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.name).toBe("openai");
    });

    test("creates anthropic provider", () => {
      const provider = createProvider({ provider: "anthropic", apiKey: "test-key" });
      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.name).toBe("anthropic");
    });

    test("creates ollama provider", () => {
      const provider = createProvider({ provider: "ollama" });
      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(provider.name).toBe("ollama");
    });

    test("throws when provider is unknown", () => {
      expect(() => createProvider({ provider: "unknown" })).toThrow(ProviderError);
    });

    test("throws when no provider or key is configured", () => {
      const originalProvider = process.env.AI_SUMMARY_PROVIDER;
      const originalOpenAI = process.env.OPENAI_API_KEY;
      const originalAnthropic = process.env.ANTHROPIC_API_KEY;
      const originalOllama = process.env.OLLAMA_HOST;

      delete process.env.AI_SUMMARY_PROVIDER;
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OLLAMA_HOST;

      try {
        expect(() => createProvider()).toThrow(ProviderError);
      } finally {
        process.env.AI_SUMMARY_PROVIDER = originalProvider;
        process.env.OPENAI_API_KEY = originalOpenAI;
        process.env.ANTHROPIC_API_KEY = originalAnthropic;
        process.env.OLLAMA_HOST = originalOllama;
      }
    });
  });

  describe("MockProvider", () => {
    test("streams a valid JSON response", async () => {
      const provider = new MockProvider();
      const chunks: string[] = [];
      for await (const chunk of provider.generate({ messages: [], temperature: 0 })) {
        chunks.push(chunk);
      }
      const raw = chunks.join("");
      expect(JSON.parse(raw)).toHaveProperty("summary");
    });
  });
});
