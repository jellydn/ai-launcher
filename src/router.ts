import { templateRequiresConfirmation } from "./template";
import type { Template } from "./types";

export interface RouterSelection {
  template: string;
  arguments: string[];
}

export interface RoutedTemplateSelection {
  template: Template;
  requiresConfirmation: boolean;
}

function formatTemplateSummary(template: Template): string {
  const aliases =
    template.aliases && template.aliases.length > 0 ? template.aliases.join(", ") : "none";
  const mode = template.mode ?? "unspecified";
  const requiresConfirmationLabel = templateRequiresConfirmation(template) ? "yes" : "no";

  return [
    `- ${template.name}`,
    `  description: ${template.description}`,
    `  aliases: ${aliases}`,
    `  mode: ${mode}`,
    `  requiresConfirmation: ${requiresConfirmationLabel}`,
  ].join("\n");
}

export function buildRouterPrompt(
  task: string,
  templates: Template[],
  stdinContent?: string
): string {
  const templateCatalog = templates.map((template) => formatTemplateSummary(template)).join("\n");
  const promptSections = [
    "You are a semantic router for ai-launcher.",
    "Select the single best template from the allowed list for the user's task.",
    'Return ONLY valid JSON with this shape: {"template":"<name>","arguments":["..."]}',
    "Do not return markdown, explanations, or shell commands.",
    "Do not invent templates. Only choose from the allowed list.",
    "If the task is ambiguous, choose the most specific template and keep arguments conservative.",
    "Allowed templates:",
    templateCatalog,
  ];

  if (stdinContent && stdinContent.trim().length > 0) {
    promptSections.push(`Additional stdin context:\n${stdinContent.trim()}`);
  }

  promptSections.push(`User request:\n${task.trim()}`);

  return promptSections.filter((section) => section.trim().length > 0).join("\n\n");
}

function stripCodeFenceWrappers(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
}

function extractJsonCandidate(text: string): string | null {
  const trimmed = stripCodeFenceWrappers(text);

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // Fall through to substring extraction.
  }

  const startIndex = trimmed.indexOf("{");
  const endIndex = trimmed.lastIndexOf("}");
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  const candidate = trimmed.slice(startIndex, endIndex + 1);
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return null;
  }
}

export function parseRouterResponse(output: string): RouterSelection | null {
  const candidate = extractJsonCandidate(output);
  if (!candidate) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const result = parsed as Record<string, unknown>;
  if (typeof result.template !== "string" || result.template.trim() === "") {
    return null;
  }

  const argumentsValue = result.arguments;
  if (
    argumentsValue !== undefined &&
    (!Array.isArray(argumentsValue) || !argumentsValue.every((item) => typeof item === "string"))
  ) {
    return null;
  }

  return {
    template: result.template.trim(),
    arguments: argumentsValue ?? [],
  };
}

export function resolveRouterSelection(
  selection: RouterSelection,
  templates: Template[]
): RoutedTemplateSelection | null {
  const template = templates.find((item) => item.name === selection.template);
  if (!template) {
    return null;
  }

  return {
    template,
    requiresConfirmation: templateRequiresConfirmation(template),
  };
}
