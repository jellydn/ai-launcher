import { describe, expect, test } from "bun:test";
import { classifyPrompt } from "./classify.ts";
import { extractMeetingPrompt } from "./extract-meeting.ts";
import { formatPromptInspection, formatPromptList, getPrompt } from "./registry.ts";
import { summarizePrompt } from "./summarize.ts";

describe("prompt registry", () => {
  test("lists stable prompt IDs and versions", () => {
    const list = formatPromptList();
    expect(list).toContain("summarize-content");
    expect(list).toContain("classify-input");
    expect(list).toContain("extract-meeting");
    expect(list).toContain("v1.0.0");
  });

  test("finds and describes a prompt", () => {
    const prompt = getPrompt("extract-meeting");
    expect(prompt).toBe(extractMeetingPrompt);
    expect(prompt.render({ transcript: "Weekly sync" }).user).toContain("Weekly sync");
    expect(formatPromptInspection("extract-meeting")).toContain("transcript: string, required");
    expect(formatPromptInspection("missing")).toBeUndefined();
    expect(getPrompt("toString")).toBeUndefined();
  });
});

describe("summarize prompt", () => {
  test("separates instructions from user content and renders optional constraints", () => {
    const prompt = summarizePrompt.render({
      content: "Bun released a faster test runner.",
      mode: "technical",
      audience: "TypeScript developers",
      maxLength: 100,
    });

    expect(prompt.system).toContain("summarization assistant");
    expect(prompt.system).toContain('"action_items"');
    expect(prompt.user).toContain("technical:");
    expect(prompt.user).toContain("Write for TypeScript developers.");
    expect(prompt.user).toContain("within 100 words");
    expect(prompt.user).toContain("Bun released a faster test runner.");
  });

  test("validates required variables", () => {
    expect(() => summarizePrompt.render({ content: "", mode: "tldr" })).toThrow(
      /Validation failed for prompt "summarize-content".*content is required/
    );
  });
});

describe("classification prompt", () => {
  test("renders the supported categories and content", () => {
    const prompt = classifyPrompt.render({ content: "diff --git a/file.ts b/file.ts" });

    expect(prompt.system).toContain("article | meeting | git-diff | email | code | unknown");
    expect(prompt.system).toContain('"confidence"');
    expect(prompt.system).toContain("Do not use markdown code fences");
    expect(prompt.user).toContain("diff --git a/file.ts b/file.ts");
  });
});

describe("meeting extraction prompt", () => {
  test("keeps stable structured-output and anti-hallucination instructions", () => {
    const prompt = extractMeetingPrompt.render({ transcript: "Alex will ship on Friday." });

    expect(prompt.system).toContain('"summary": "..."');
    expect(prompt.system).toContain('"action_items"');
    expect(prompt.system).toContain('"risks"');
    expect(prompt.system).toContain("do not hallucinate");
    expect(prompt.user).toBe('Transcript:\n"""\nAlex will ship on Friday.\n"""');
  });

  test("rejects a missing transcript", () => {
    expect(() => extractMeetingPrompt.render({ transcript: "" })).toThrow(
      /Validation failed for prompt "extract-meeting".*transcript is required/
    );
  });
});
