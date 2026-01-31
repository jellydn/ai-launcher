import { describe, expect, test } from "bun:test";
import { GitDiffError, NoChangesError } from "./errors";
import { ensureGitRepository, getGitDiff, isGitRepository } from "./git-diff";
import { buildDiffAnalysisPrompt } from "./prompts";

describe("git-diff module", () => {
  describe("isGitRepository", () => {
    test("returns boolean for git repository check", () => {
      const result = isGitRepository();
      expect(typeof result).toBe("boolean");
    });

    test("returns true when in git repository", () => {
      // We're running tests in a git repo
      const result = isGitRepository();
      expect(result).toBe(true);
    });
  });

  describe("ensureGitRepository", () => {
    test("does not throw when in git repository", () => {
      expect(() => ensureGitRepository()).not.toThrow();
    });
  });

  describe("getGitDiff", () => {
    test("throws NoChangesError when no staged changes", () => {
      expect(() => getGitDiff({ type: "staged" })).toThrow(NoChangesError);
    });

    test("throws GitDiffError for invalid options", () => {
      expect(() => getGitDiff({ type: "commit" })).toThrow(GitDiffError);
    });
  });
});

describe("prompts module", () => {
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

    test("appends custom prompt when provided", () => {
      const diff = "test diff";
      const customPrompt = "Focus on security vulnerabilities";
      const prompt = buildDiffAnalysisPrompt(diff, undefined, customPrompt);

      expect(prompt).toContain(diff);
      expect(prompt).toContain(customPrompt);
      expect(prompt).toContain("summary");
    });

    test("appends custom prompt with ref", () => {
      const diff = "test diff";
      const customPrompt = "Check for breaking changes";
      const prompt = buildDiffAnalysisPrompt(diff, "main", customPrompt);

      expect(prompt).toContain("main");
      expect(prompt).toContain(diff);
      expect(prompt).toContain(customPrompt);
    });
  });
});
