import { describe, expect, test } from "bun:test";
import { buildLaunchArgv, stripOuterQuotes } from "./launch-argv";

describe("stripOuterQuotes", () => {
  test("strips matching single quotes", () => {
    expect(stripOuterQuotes("'hello'")).toBe("hello");
  });

  test("strips matching double quotes", () => {
    expect(stripOuterQuotes('"hello"')).toBe("hello");
  });

  test("leaves unmatched or inner quotes alone", () => {
    expect(stripOuterQuotes("hello")).toBe("hello");
    expect(stripOuterQuotes("'hello\"")).toBe("'hello\"");
    expect(stripOuterQuotes("a'b'")).toBe("a'b'");
  });
});

describe("buildLaunchArgv", () => {
  test("appends input as a single argv element when there is no $@", () => {
    expect(buildLaunchArgv("fake-ai --mode plan", "hello world")).toEqual({
      cmd: "fake-ai",
      args: ["--mode", "plan", "hello world"],
    });
  });

  test("does not append empty input when there is no $@", () => {
    expect(buildLaunchArgv("fake-ai --help", "")).toEqual({
      cmd: "fake-ai",
      args: ["--help"],
    });
  });

  test("substitutes $@ inside a quoted token as one argv element", () => {
    const input = "hello world; echo PWNED";
    expect(buildLaunchArgv("fake-ai -x 'Review: $@'", input)).toEqual({
      cmd: "fake-ai",
      args: ["-x", `Review: ${input}`],
    });
  });

  test("substitutes $@ with multi-line input without re-splitting", () => {
    const input = "line1\nline2 with spaces";
    expect(buildLaunchArgv('amp -x "Explain: $@"', input)).toEqual({
      cmd: "amp",
      args: ["-x", `Explain: ${input}`],
    });
  });

  test("strips outer quotes from fixed args", () => {
    expect(buildLaunchArgv("tool --flag 'value with spaces'", "payload")).toEqual({
      cmd: "tool",
      args: ["--flag", "value with spaces", "payload"],
    });
  });

  test("throws on multiple $@ placeholders", () => {
    expect(() => buildLaunchArgv("claude -p 'Review $@ and $@'", "file.ts")).toThrow(
      /at most one \$@/
    );
  });

  test("throws on empty command", () => {
    expect(() => buildLaunchArgv("", "input")).toThrow(/Empty command/);
  });

  test("handles $@ as the entire command token", () => {
    // Unusual but must stay a single argv element, not shell-split.
    expect(buildLaunchArgv("$@", "printf-value")).toEqual({
      cmd: "printf-value",
      args: [],
    });
  });
});
