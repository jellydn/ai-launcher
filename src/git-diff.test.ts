import { describe, expect, test } from "bun:test";
import { buildDiffAnalysisPrompt, isGitRepository } from "./git-diff";

describe("git-diff module", () => {
  describe("isGitRepository", () => {
    test("returns boolean for git repository check", () => {
      const result = isGitRepository();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("buildDiffAnalysisPrompt", () => {
    test("builds prompt with diff and default target", () => {
      const diff = "diff --git a/file.ts b/file.ts\n+added line";
      const prompt = buildDiffAnalysisPrompt(diff);

      expect(prompt).toContain("staged changes");
      expect(prompt).toContain(diff);
      expect(prompt).toContain("summary");
      expect(prompt).toContain("risks");
      expect(prompt).toContain("best practices");
    });

    test("builds prompt with custom ref", () => {
      const diff = "diff --git a/file.ts b/file.ts\n+added line";
      const prompt = buildDiffAnalysisPrompt(diff, "HEAD~1");

      expect(prompt).toContain("HEAD~1");
      expect(prompt).toContain(diff);
    });

    test("includes analysis requirements in prompt", () => {
      const diff = "test diff";
      const prompt = buildDiffAnalysisPrompt(diff);

      expect(prompt).toContain("summary");
      expect(prompt).toContain("risks");
      expect(prompt).toContain("align");
      expect(prompt).toContain("improvement");
    });
  });
});
