import { classifyPrompt } from "./classify.ts";
import { extractMeetingPrompt } from "./extract-meeting.ts";
import { summarizePrompt } from "./summarize.ts";

const promptById = {
  "summarize-content": summarizePrompt,
  "classify-input": classifyPrompt,
  "extract-meeting": extractMeetingPrompt,
} as const;

export const promptRegistry = Object.values(promptById);

export type PromptId = keyof typeof promptById;
type RegisteredPrompt = (typeof promptRegistry)[number];
type PromptById<TId extends PromptId> = (typeof promptById)[TId];

export function getPrompt<TId extends PromptId>(id: TId): PromptById<TId>;
export function getPrompt(id: string): RegisteredPrompt | undefined;
export function getPrompt(id: string): RegisteredPrompt | undefined {
  return promptById[id as PromptId];
}

export function formatPromptList(): string {
  const idWidth = Math.max(...promptRegistry.map((prompt) => prompt.id.length)) + 2;
  return promptRegistry
    .map((prompt) => `${prompt.id.padEnd(idWidth)}v${prompt.version}`)
    .join("\n");
}

export function formatPromptInspection(id: string): string | undefined {
  const prompt = getPrompt(id);
  if (!prompt) {
    return undefined;
  }

  const variables = prompt.variables.map(
    (variable) =>
      `  - ${variable.name}: ${variable.type}, ${variable.required ? "required" : "optional"} — ${variable.description}`
  );
  const output = prompt.output.map((field) => `  - ${field}`);

  return [
    `ID: ${prompt.id}`,
    `Version: ${prompt.version}`,
    `Description: ${prompt.description}`,
    "Variables:",
    ...variables,
    "Output:",
    ...output,
  ].join("\n");
}
