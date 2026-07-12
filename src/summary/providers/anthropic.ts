import type { GenerateOptions, Message, Provider } from "../provider.ts";
import { ProviderError } from "../provider.ts";

interface AnthropicConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface AnthropicStreamData {
  type: string;
  delta?: unknown;
}

function getAnthropicApiKey(config: AnthropicConfig): string {
  const key = config.apiKey ?? process.env.AI_SUMMARY_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new ProviderError(
      "Anthropic provider requires an API key. Set AI_SUMMARY_API_KEY or ANTHROPIC_API_KEY."
    );
  }
  return key;
}

function getAnthropicUrl(config: AnthropicConfig): string {
  return (
    config.baseUrl ??
    process.env.ANTHROPIC_BASE_URL ??
    "https://api.anthropic.com/v1"
  ).replace(/\/$/, "");
}

function getAnthropicModel(config: AnthropicConfig): string {
  return config.model ?? process.env.AI_SUMMARY_MODEL ?? "claude-3-5-haiku-20241022";
}

function toAnthropicMessages(messages: Message[]): { role: "user"; content: string }[] {
  // Caller filters to user roles; keep this guard for direct/test misuse.
  return messages.map((message) => {
    if (message.role !== "user") {
      throw new ProviderError("Anthropic messages must be user role");
    }
    return { role: "user", content: message.content };
  });
}

async function* streamAnthropicResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      const data = line.slice("data: ".length).trim();
      if (!data) {
        continue;
      }

      let parsed: AnthropicStreamData;
      try {
        parsed = JSON.parse(data) as AnthropicStreamData;
      } catch {
        continue;
      }

      if (
        parsed.type === "content_block_delta" &&
        parsed.delta !== null &&
        typeof parsed.delta === "object" &&
        "type" in parsed.delta &&
        parsed.delta.type === "text_delta" &&
        "text" in parsed.delta &&
        typeof parsed.delta.text === "string" &&
        parsed.delta.text.length > 0
      ) {
        yield parsed.delta.text;
      }
    }
  }
}

export class AnthropicProvider implements Provider {
  readonly name = "anthropic";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: AnthropicConfig = {}) {
    this.apiKey = getAnthropicApiKey(config);
    this.baseUrl = getAnthropicUrl(config);
    this.model = getAnthropicModel(config);
  }

  async *generate(options: GenerateOptions): AsyncGenerator<string> {
    const systemMessage = options.messages.find((message) => message.role === "system");
    const userMessages = options.messages.filter((message) => message.role === "user");

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        system: systemMessage?.content,
        messages: toAnthropicMessages(userMessages),
        temperature: options.temperature,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        `Anthropic request failed: ${response.status} ${response.statusText} - ${body}`
      );
    }

    if (!response.body) {
      throw new ProviderError("Anthropic response did not contain a stream");
    }

    const reader = response.body.getReader();
    yield* streamAnthropicResponse(reader);
  }
}
