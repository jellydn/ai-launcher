import type { GenerateOptions, Provider } from "../provider.ts";
import { ProviderError } from "../provider.ts";
import { streamOpenAIResponse } from "./openai.ts";

interface OpenRouterConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  referer?: string;
  title?: string;
}

function getOpenRouterApiKey(config: OpenRouterConfig): string {
  const key = config.apiKey ?? process.env.AI_SUMMARY_API_KEY ?? process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new ProviderError(
      "OpenRouter provider requires an API key. Set AI_SUMMARY_API_KEY or OPENROUTER_API_KEY."
    );
  }
  return key;
}

function getOpenRouterUrl(config: OpenRouterConfig): string {
  return (
    config.baseUrl ??
    process.env.OPENROUTER_BASE_URL ??
    "https://openrouter.ai/api/v1"
  ).replace(/\/$/, "");
}

function getOpenRouterModel(config: OpenRouterConfig): string {
  return config.model ?? process.env.AI_SUMMARY_MODEL ?? "openrouter/free";
}

function getOpenRouterReferer(): string {
  return process.env.OPENROUTER_REFERER ?? "https://github.com/jellydn/ai-launcher";
}

function getOpenRouterTitle(): string {
  return process.env.OPENROUTER_TITLE ?? "ai-summary";
}

export class OpenRouterProvider implements Provider {
  readonly name = "openrouter";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly referer: string;
  private readonly title: string;

  constructor(config: OpenRouterConfig = {}) {
    this.apiKey = getOpenRouterApiKey(config);
    this.baseUrl = getOpenRouterUrl(config);
    this.model = getOpenRouterModel(config);
    this.referer = config.referer ?? getOpenRouterReferer();
    this.title = config.title ?? getOpenRouterTitle();
  }

  async *generate(options: GenerateOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": this.referer,
        "X-Title": this.title,
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        `OpenRouter request failed: ${response.status} ${response.statusText} - ${body}`
      );
    }

    if (!response.body) {
      throw new ProviderError("OpenRouter response did not contain a stream");
    }

    const reader = response.body.getReader();
    yield* streamOpenAIResponse(reader);
  }
}
