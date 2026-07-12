import type { GenerateOptions, Message, Provider } from "../provider.ts";
import { ProviderError } from "../provider.ts";

interface OllamaConfig {
  baseUrl?: string;
  model?: string;
}

interface OllamaStreamData {
  message?: {
    content?: string;
  };
  done?: boolean;
}

function getOllamaUrl(config: OllamaConfig): string {
  return (config.baseUrl ?? process.env.OLLAMA_HOST ?? "http://localhost:11434").replace(/\/$/, "");
}

function getOllamaModel(config: OllamaConfig): string {
  return config.model ?? process.env.OLLAMA_MODEL ?? "llama3.1";
}

function toOllamaMessages(messages: Message[]): { role: string; content: string }[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function* streamOllamaResponse(
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
      if (!line.trim()) {
        continue;
      }

      let parsed: OllamaStreamData;
      try {
        parsed = JSON.parse(line) as OllamaStreamData;
      } catch {
        continue;
      }

      if (parsed.done) {
        continue;
      }

      const content = parsed.message?.content;
      if (typeof content === "string" && content.length > 0) {
        yield content;
      }
    }
  }

  const remaining = buffer.trim();
  if (remaining) {
    try {
      const parsed = JSON.parse(remaining) as OllamaStreamData;
      const content = parsed.message?.content;
      if (typeof content === "string" && content.length > 0) {
        yield content;
      }
    } catch {
      // ignore trailing malformed data
    }
  }
}

export class OllamaProvider implements Provider {
  readonly name = "ollama";
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = getOllamaUrl(config);
    this.model = getOllamaModel(config);
  }

  async *generate(options: GenerateOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: toOllamaMessages(options.messages),
        stream: true,
        options: {
          temperature: options.temperature,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Unknown error");
      throw new ProviderError(
        `Ollama request failed: ${response.status} ${response.statusText} - ${body}`
      );
    }

    if (!response.body) {
      throw new ProviderError("Ollama response did not contain a stream");
    }

    const reader = response.body.getReader();
    yield* streamOllamaResponse(reader);
  }
}
