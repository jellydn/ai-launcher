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
});
