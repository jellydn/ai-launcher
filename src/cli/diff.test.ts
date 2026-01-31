import { describe, expect, test } from "bun:test";
import { GitDiffError } from "../errors";
import { parseDiffArgs } from "./diff";

describe("cli/diff module", () => {
  describe("parseDiffArgs", () => {
    test("returns false when no diff flags present", () => {
      const result = parseDiffArgs(["claude", "--help"]);
      expect(result.hasDiffCommand).toBe(false);
    });

    test("parses --diff-staged flag", () => {
      const result = parseDiffArgs(["--diff-staged"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.type).toBe("staged");
      expect(result.diffFlagIndex).toBe(0);
    });

    test("parses --diff-staged with tool name before", () => {
      const result = parseDiffArgs(["claude", "--diff-staged"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.type).toBe("staged");
      expect(result.diffFlagIndex).toBe(1);
    });

    test("parses --diff-commit with valid ref", () => {
      const result = parseDiffArgs(["--diff-commit", "HEAD~1"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.type).toBe("commit");
      expect(result.options?.ref).toBe("HEAD~1");
      expect(result.diffFlagIndex).toBe(0);
    });

    test("parses --diff-commit with branch name", () => {
      const result = parseDiffArgs(["--diff-commit", "main"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.type).toBe("commit");
      expect(result.options?.ref).toBe("main");
    });

    test("parses --diff-commit with remote branch", () => {
      const result = parseDiffArgs(["--diff-commit", "origin/main"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.ref).toBe("origin/main");
    });

    test("parses --diff-commit with commit SHA", () => {
      const result = parseDiffArgs(["--diff-commit", "abc123def456"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.ref).toBe("abc123def456");
    });

    test("prioritizes --diff-staged when both flags present", () => {
      const result = parseDiffArgs(["--diff-staged", "--diff-commit", "HEAD~1"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.type).toBe("staged");
      expect(result.diffFlagIndex).toBe(0);
    });

    test("throws error when --diff-commit has no ref", () => {
      expect(() => parseDiffArgs(["--diff-commit"])).toThrow(GitDiffError);
    });

    test("throws error when --diff-commit ref starts with dash", () => {
      expect(() => parseDiffArgs(["--diff-commit", "--help"])).toThrow(GitDiffError);
    });

    test("throws error for invalid ref with shell metacharacters", () => {
      expect(() => parseDiffArgs(["--diff-commit", "main; rm -rf /"])).toThrow(GitDiffError);
      expect(() => parseDiffArgs(["--diff-commit", "main && echo bad"])).toThrow(GitDiffError);
      expect(() => parseDiffArgs(["--diff-commit", "main | cat"])).toThrow(GitDiffError);
      expect(() => parseDiffArgs(["--diff-commit", "$(whoami)"])).toThrow(GitDiffError);
      expect(() => parseDiffArgs(["--diff-commit", "`whoami`"])).toThrow(GitDiffError);
    });

    test("allows valid git ref operators", () => {
      expect(() => parseDiffArgs(["--diff-commit", "HEAD~3"])).not.toThrow();
      expect(() => parseDiffArgs(["--diff-commit", "HEAD^"])).not.toThrow();
      expect(() => parseDiffArgs(["--diff-commit", "main@{yesterday}"])).not.toThrow();
      expect(() => parseDiffArgs(["--diff-commit", "feature/my-branch"])).not.toThrow();
    });

    test("rejects refs with multiple consecutive dots", () => {
      expect(() => parseDiffArgs(["--diff-commit", "HEAD..main"])).toThrow(GitDiffError);
    });
  });

  describe("argument position handling", () => {
    test("extracts tool name before --diff-staged", () => {
      const result = parseDiffArgs(["claude", "--diff-staged"]);
      expect(result.diffFlagIndex).toBe(1);
    });

    test("handles multiple args before flag", () => {
      const result = parseDiffArgs(["claude", "arg1", "--diff-staged"]);
      expect(result.diffFlagIndex).toBe(2);
    });
  });

  describe("--diff-prompt flag", () => {
    test("parses --diff-prompt with --diff-staged", () => {
      const result = parseDiffArgs(["--diff-staged", "--diff-prompt", "Focus on security"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.customPrompt).toBe("Focus on security");
    });

    test("parses --diff-prompt with --diff-commit", () => {
      const result = parseDiffArgs([
        "--diff-commit",
        "HEAD~1",
        "--diff-prompt",
        "Check for breaking changes",
      ]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.customPrompt).toBe("Check for breaking changes");
    });

    test("throws error when --diff-prompt has no value", () => {
      expect(() => parseDiffArgs(["--diff-staged", "--diff-prompt"])).toThrow(GitDiffError);
    });

    test("throws error when --diff-prompt value starts with dash", () => {
      expect(() => parseDiffArgs(["--diff-staged", "--diff-prompt", "--help"])).toThrow(
        GitDiffError
      );
    });
  });

  describe("--diff-output flag", () => {
    test("parses --diff-output with --diff-staged", () => {
      const result = parseDiffArgs(["--diff-staged", "--diff-output", "analysis.md"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.outputFile).toBe("analysis.md");
    });

    test("parses --diff-output with --diff-commit", () => {
      const result = parseDiffArgs(["--diff-commit", "HEAD~1", "--diff-output", "output.md"]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.outputFile).toBe("output.md");
    });

    test("throws error when --diff-output has no value", () => {
      expect(() => parseDiffArgs(["--diff-staged", "--diff-output"])).toThrow(GitDiffError);
    });

    test("throws error when --diff-output value starts with dash", () => {
      expect(() => parseDiffArgs(["--diff-staged", "--diff-output", "--help"])).toThrow(
        GitDiffError
      );
    });
  });

  describe("combined flags", () => {
    test("parses all flags together with --diff-staged", () => {
      const result = parseDiffArgs([
        "--diff-staged",
        "--diff-prompt",
        "Custom prompt",
        "--diff-output",
        "result.md",
      ]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.type).toBe("staged");
      expect(result.options?.customPrompt).toBe("Custom prompt");
      expect(result.options?.outputFile).toBe("result.md");
    });

    test("parses all flags together with --diff-commit", () => {
      const result = parseDiffArgs([
        "--diff-commit",
        "main",
        "--diff-prompt",
        "Review carefully",
        "--diff-output",
        "analysis.md",
      ]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.type).toBe("commit");
      expect(result.options?.ref).toBe("main");
      expect(result.options?.customPrompt).toBe("Review carefully");
      expect(result.options?.outputFile).toBe("analysis.md");
    });

    test("parses flags in different order", () => {
      const result = parseDiffArgs([
        "--diff-output",
        "test.md",
        "--diff-staged",
        "--diff-prompt",
        "Check style",
      ]);
      expect(result.hasDiffCommand).toBe(true);
      expect(result.options?.customPrompt).toBe("Check style");
      expect(result.options?.outputFile).toBe("test.md");
    });
  });
});
