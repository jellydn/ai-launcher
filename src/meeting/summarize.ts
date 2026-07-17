// biome-ignore assist/source/organizeImports: keep type-only imports grouped before internal value imports per CONVENTIONS.md
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { MeetingSummary } from "./schema.ts";
import { extractMeetingPrompt } from "../prompts/extract-meeting.ts";
import { MeetingSummarySchema } from "./schema.ts";

export interface SummarizeOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  onChunk?: (chunk: string) => void;
}

const DEFAULT_MODEL = "gpt-4o-2024-08-06";
const DEFAULT_TEMPERATURE = 0.1;

export async function summarizeMeeting(
  transcript: string,
  options: SummarizeOptions = {}
): Promise<MeetingSummary> {
  const isOpenRouter = options.baseURL?.includes("openrouter.ai") ?? false;
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    defaultHeaders: isOpenRouter
      ? {
          "HTTP-Referer": "https://github.com/jellydn/ai-launcher",
          "X-OpenRouter-Title": "ai-meeting",
        }
      : undefined,
  });

  const responseFormat = zodResponseFormat(MeetingSummarySchema, "meeting_summary");
  const prompt = extractMeetingPrompt.render({ transcript });

  const stream = client.chat.completions.stream({
    model: options.model ?? DEFAULT_MODEL,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    response_format: responseFormat,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content && options.onChunk) {
      options.onChunk(content);
    }
  }

  const completion = await stream.finalChatCompletion();
  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new Error(`Model refused: ${message.refusal}`);
  }

  const parsed = message?.parsed;
  if (parsed) {
    return parsed;
  }

  const content = message?.content;
  if (!content) {
    throw new Error("No parsed output received from the model");
  }

  return MeetingSummarySchema.parse(JSON.parse(content));
}
