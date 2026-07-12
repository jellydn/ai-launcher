import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { SummarizeOptions } from "./summarize.ts";

const createdClients: unknown[] = [];
const streamCalls: unknown[] = [];

let finalCompletion: unknown;
let chunks: unknown[] = [];

function createMockStream(mockChunks: unknown[]) {
  const stream = {
    async *[Symbol.asyncIterator]() {
      for (const chunk of mockChunks) {
        yield chunk;
      }
    },
    async finalChatCompletion() {
      return finalCompletion;
    },
  };
  return stream;
}

class MockOpenAI {
  public options: { apiKey: string; baseURL?: string; defaultHeaders?: Record<string, string> };

  constructor(options: {
    apiKey: string;
    baseURL?: string;
    defaultHeaders?: Record<string, string>;
  }) {
    this.options = options;
    createdClients.push(options);
  }

  chat = {
    completions: {
      stream: (params: unknown) => {
        streamCalls.push(params);
        return createMockStream(chunks);
      },
    },
  };
}

mock.module("openai", () => ({
  default: MockOpenAI,
}));

mock.module("openai/helpers/zod", () => ({
  zodResponseFormat: (schema: unknown, name: string) => ({
    type: "json_schema",
    schema,
    name,
  }),
}));

import { summarizeMeeting } from "./summarize.ts";

const mockChunks = [
  { choices: [{ delta: { content: "{" } }] },
  { choices: [{ delta: { content: "}" } }] },
];

const mockSummary = {
  summary: "Team sync on the BACX migration.",
  action_items: [{ owner: "Dung", task: "Move Better Auth to VPS", due: "Next week" }],
  risks: ["AWS migration delay"],
};

describe("summarizeMeeting", () => {
  beforeEach(() => {
    createdClients.length = 0;
    streamCalls.length = 0;
    chunks = [...mockChunks];
    finalCompletion = {
      choices: [
        {
          message: {
            parsed: mockSummary,
            content: JSON.stringify(mockSummary),
          },
        },
      ],
    };
  });

  test("returns the parsed meeting summary", async () => {
    const result = await summarizeMeeting("transcript", { apiKey: "sk-test" });

    expect(result).toEqual(mockSummary);
  });

  test("streams chunks through onChunk", async () => {
    const onChunk = mock(() => {});

    await summarizeMeeting("transcript", {
      apiKey: "sk-test",
      onChunk,
    });

    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenCalledWith("{");
    expect(onChunk).toHaveBeenCalledWith("}");
  });

  test("uses the default model and temperature when not provided", async () => {
    await summarizeMeeting("transcript", { apiKey: "sk-test" });

    const streamCall = streamCalls[0] as SummarizeOptions & {
      model: string;
      temperature: number;
      response_format: { type: string };
    };
    expect(streamCall.model).toBe("gpt-4o-2024-08-06");
    expect(streamCall.temperature).toBe(0.1);
    expect(streamCall.response_format.type).toBe("json_schema");
  });

  test("uses the provided model and temperature", async () => {
    await summarizeMeeting("transcript", {
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      temperature: 0.5,
    });

    const streamCall = streamCalls[0] as SummarizeOptions & {
      model: string;
      temperature: number;
    };
    expect(streamCall.model).toBe("gpt-4o-mini");
    expect(streamCall.temperature).toBe(0.5);
  });

  test("sets OpenRouter attribution headers when baseURL points to OpenRouter", async () => {
    await summarizeMeeting("transcript", {
      apiKey: "sk-or-test",
      baseURL: "https://openrouter.ai/api/v1",
    });

    const client = createdClients[0] as { defaultHeaders: Record<string, string> };
    expect(client.defaultHeaders["HTTP-Referer"]).toBe("https://github.com/jellydn/ai-launcher");
    expect(client.defaultHeaders["X-OpenRouter-Title"]).toBe("ai-meeting");
  });

  test("does not set OpenRouter headers for a plain OpenAI base URL", async () => {
    await summarizeMeeting("transcript", {
      apiKey: "sk-test",
      baseURL: "https://api.openai.com/v1",
    });

    const client = createdClients[0] as { defaultHeaders?: Record<string, string> };
    expect(client.defaultHeaders).toBeUndefined();
  });

  test("throws when the model refuses", async () => {
    finalCompletion = {
      choices: [
        {
          message: {
            refusal: "I cannot summarize this content.",
            parsed: null,
          },
        },
      ],
    };

    await expect(summarizeMeeting("transcript", { apiKey: "sk-test" })).rejects.toThrow(
      "Model refused"
    );
  });

  test("throws when no parsed output is received", async () => {
    finalCompletion = {
      choices: [
        {
          message: {
            parsed: null,
            content: null,
          },
        },
      ],
    };

    await expect(summarizeMeeting("transcript", { apiKey: "sk-test" })).rejects.toThrow(
      "No parsed output"
    );
  });
});
