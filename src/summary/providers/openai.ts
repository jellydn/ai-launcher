import type { GenerateOptions, Provider } from "../provider.ts";
import { ProviderError } from "../provider.ts";

interface OpenAIConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface OpenAIStreamChoice {
  delta?: {
    content?: string | null;
  };
}

interface OpenAIStreamData {
  choices?: OpenAIStreamChoice[];
}

function getOpenAIApiKey(config: OpenAIConfig): string {
  const key = config.apiKey ?? process.env.AI_SUMMARY_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new ProviderError(
      "OpenAI provider requires an API key. Set AI_SUMMARY_API_KEY or OPENAI_API_KEY."
    );
  }
  return key;
}

function getOpenAIUrl(config: OpenAIConfig): string {
  return (config.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );
}

function getOpenAIModel(config: OpenAIConfig): string {
  return config.model ?? process.env.AI_SUMMARY_MODEL ?? "gpt-4o-mini";
}

export async function* streamOpenAIResponse(
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
      if (data === "[DONE]") {
        continue;
      }

      if (!data) {
        continue;
      }

      let parsed: OpenAIStreamData;
      try {
        parsed = JSON.parse(data) as OpenAIStreamData;
      } catch {
        continue;
      }

      const content = parsed.choices?.[0]?.delta?.content;
      if (typeof content === "string" && content.length > 0) {
        yield content;
      }
    }
  }

  const remaining = buffer.trim();
  if (remaining.startsWith("data: ")) {
    const data = remaining.slice("data: ".length).trim();
    if (data && data !== "[DONE]") {
      try {
        const parsed = JSON.parse(data) as OpenAIStreamData;
        const content = parsed.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) {
          yield content;
        }
      } catch {
        // ignore trailing malformed data
      }
    }
  }
}

export class OpenAIProvider implements Provider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: OpenAIConfig = {}) {
    this.apiKey = getOpenAIApiKey(config);
    this.baseUrl = getOpenAIUrl(config);
    this.model = getOpenAIModel(config);
  }

  async *generate(options: GenerateOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature,
        stream: true,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        `OpenAI request failed: ${response.status} ${response.statusText} - ${body}`
      );
    }

    if (!response.body) {
      throw new ProviderError("OpenAI response did not contain a stream");
    }

    const reader = response.body.getReader();
    yield* streamOpenAIResponse(reader);
  }
}
