import { describe, expect, test } from "bun:test";
import { createProvider, ProviderError } from "./provider.ts";
import { AnthropicProvider } from "./providers/anthropic.ts";
import { MockProvider } from "./providers/mock.ts";
import { OllamaProvider } from "./providers/ollama.ts";
import { OpenAIProvider } from "./providers/openai.ts";
import { OpencodeProvider } from "./providers/opencode.ts";
import { OpenRouterProvider } from "./providers/openrouter.ts";

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

    test("creates openrouter provider", () => {
      const provider = createProvider({ provider: "openrouter", apiKey: "test-key" });
      expect(provider).toBeInstanceOf(OpenRouterProvider);
      expect(provider.name).toBe("openrouter");
    });

    test("creates opencode provider", () => {
      const provider = createProvider({ provider: "opencode" });
      expect(provider).toBeInstanceOf(OpencodeProvider);
      expect(provider.name).toBe("opencode");
    });

    test("throws when provider is unknown", () => {
      expect(() => createProvider({ provider: "unknown" })).toThrow(ProviderError);
    });

    test("throws when no provider or key is configured", () => {
      const originalProvider = process.env.AI_SUMMARY_PROVIDER;
      const originalApiKey = process.env.AI_SUMMARY_API_KEY;
      const originalOpenAI = process.env.OPENAI_API_KEY;
      const originalAnthropic = process.env.ANTHROPIC_API_KEY;
      const originalOllama = process.env.OLLAMA_HOST;
      const originalOpenRouter = process.env.OPENROUTER_API_KEY;

      delete process.env.AI_SUMMARY_PROVIDER;
      delete process.env.AI_SUMMARY_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OLLAMA_HOST;
      delete process.env.OPENROUTER_API_KEY;

      try {
        expect(() => createProvider()).toThrow(ProviderError);
      } finally {
        if (originalProvider === undefined) {
          delete process.env.AI_SUMMARY_PROVIDER;
        } else {
          process.env.AI_SUMMARY_PROVIDER = originalProvider;
        }
        if (originalApiKey === undefined) {
          delete process.env.AI_SUMMARY_API_KEY;
        } else {
          process.env.AI_SUMMARY_API_KEY = originalApiKey;
        }
        if (originalOpenAI === undefined) {
          delete process.env.OPENAI_API_KEY;
        } else {
          process.env.OPENAI_API_KEY = originalOpenAI;
        }
        if (originalAnthropic === undefined) {
          delete process.env.ANTHROPIC_API_KEY;
        } else {
          process.env.ANTHROPIC_API_KEY = originalAnthropic;
        }
        if (originalOllama === undefined) {
          delete process.env.OLLAMA_HOST;
        } else {
          process.env.OLLAMA_HOST = originalOllama;
        }
        if (originalOpenRouter === undefined) {
          delete process.env.OPENROUTER_API_KEY;
        } else {
          process.env.OPENROUTER_API_KEY = originalOpenRouter;
        }
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
