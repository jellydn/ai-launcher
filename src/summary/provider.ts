import { AnthropicProvider } from "./providers/anthropic.ts";
import { MockProvider } from "./providers/mock.ts";
import { OllamaProvider } from "./providers/ollama.ts";
import { OpenAIProvider } from "./providers/openai.ts";
import { OpencodeProvider } from "./providers/opencode.ts";
import { OpenRouterProvider } from "./providers/openrouter.ts";

export interface Message {
  role: "system" | "user";
  content: string;
}

export interface GenerateOptions {
  messages: Message[];
  temperature: number;
}

export interface Provider {
  readonly name: string;
  generate(options: GenerateOptions): AsyncIterable<string>;
}

export interface ProviderConfig {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

function inferProvider(config: ProviderConfig): string {
  if (config.provider) {
    return config.provider;
  }

  if (process.env.AI_SUMMARY_PROVIDER) {
    return process.env.AI_SUMMARY_PROVIDER;
  }

  if (config.apiKey || process.env.AI_SUMMARY_API_KEY || process.env.OPENAI_API_KEY) {
    return "openai";
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return "anthropic";
  }

  if (process.env.OLLAMA_HOST) {
    return "ollama";
  }

  if (process.env.OPENROUTER_API_KEY) {
    return "openrouter";
  }

  throw new ProviderError(
    "No provider configured. Set AI_SUMMARY_PROVIDER, or set an API key for the provider you want to use."
  );
}

export function createProvider(config: ProviderConfig = {}): Provider {
  const providerName = inferProvider(config).toLowerCase();

  switch (providerName) {
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    case "openrouter":
      return new OpenRouterProvider(config);
    case "opencode":
      return new OpencodeProvider(config);
    case "mock":
      return new MockProvider();
    default:
      throw new ProviderError(`Unknown provider: ${providerName}`);
  }
}
