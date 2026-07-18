import { describe, expect, test } from "bun:test";
import {
  checkOutputPath,
  countPlaceholderOccurrences,
  isValidGitRef,
  isValidOutputPath,
  validateArguments,
} from "./validators";

describe("validateArguments", () => {
  test("accepts simple args", () => {
    expect(validateArguments(["--help"])).toBe(true);
    expect(validateArguments(["-v"])).toBe(true);
  });

  test("accepts multiple args", () => {
    expect(validateArguments(["--model", "gpt-4", "--temperature", "0.7"])).toBe(true);
  });

  test("accepts file paths", () => {
    expect(validateArguments(["src/index.ts"])).toBe(true);
    expect(validateArguments(["/home/user/file.ts"])).toBe(true);
  });

  test("accepts args with equals", () => {
    expect(validateArguments(["--config=myconfig.json"])).toBe(true);
  });

  test("accepts args with @", () => {
    expect(validateArguments(["@file.txt"])).toBe(true);
  });

  test("accepts args with brackets", () => {
    expect(validateArguments(["[test]", "{key:value}"])).toBe(true);
  });

  test("rejects args with semicolon", () => {
    expect(validateArguments(["--help; rm -rf /"])).toBe(false);
  });

  test("rejects args with pipe", () => {
    expect(validateArguments(["--help | cat"])).toBe(false);
  });

  test("rejects args exceeding max length", () => {
    const longArg = "a".repeat(201);
    expect(validateArguments([longArg])).toBe(false);
  });

  test("accepts args at max length", () => {
    const maxArg = "a".repeat(200);
    expect(validateArguments([maxArg])).toBe(true);
  });

  test("returns true for empty args array", () => {
    expect(validateArguments([])).toBe(true);
  });

  test("rejects if any arg is invalid", () => {
    expect(validateArguments(["valid", "also-valid", "invalid;"])).toBe(false);
  });
});

describe("isValidOutputPath", () => {
  test("accepts simple relative path", () => {
    expect(isValidOutputPath("analysis.md")).toBe(true);
    expect(isValidOutputPath("output.txt")).toBe(true);
  });

  test("accepts relative path with subdirectory", () => {
    expect(isValidOutputPath("results/analysis.md")).toBe(true);
    expect(isValidOutputPath("docs/output.txt")).toBe(true);
  });

  test("accepts filenames that contain protected substrings but not root segments", () => {
    expect(isValidOutputPath("notes/home-review.md")).toBe(true);
    expect(isValidOutputPath("project/etc-config.md")).toBe(true);
    expect(isValidOutputPath("docs/usr-guide.md")).toBe(true);
  });

  test("accepts nested paths that merely contain protected names as non-root segments", () => {
    // Intentional: relative project/etc/ is not the system /etc
    expect(isValidOutputPath("project/etc/config.md")).toBe(true);
    expect(isValidOutputPath("myproject/var/log/output.txt")).toBe(true);
  });

  test("accepts explicit relative ./ prefix", () => {
    expect(isValidOutputPath("./output.md")).toBe(true);
    expect(isValidOutputPath("./docs/analysis.md")).toBe(true);
  });

  test("rejects absolute POSIX paths", () => {
    expect(isValidOutputPath("/etc/passwd")).toBe(false);
    expect(isValidOutputPath("/home/user/file.md")).toBe(false);
    expect(isValidOutputPath("/tmp/output.txt")).toBe(false);
  });

  test("rejects absolute Windows paths on any host OS", () => {
    expect(isValidOutputPath("C:/Windows/System32/evil.dll")).toBe(false);
    expect(isValidOutputPath("C:\\Windows\\foo.md")).toBe(false);
    expect(isValidOutputPath("D:\\data\\out.txt")).toBe(false);
  });

  test("rejects hidden files/dirs at any depth", () => {
    expect(isValidOutputPath(".hidden.md")).toBe(false);
    expect(isValidOutputPath(".git/config")).toBe(false);
    expect(isValidOutputPath(".config/settings.json")).toBe(false);
    expect(isValidOutputPath("sub/.git/hooks/pre-commit")).toBe(false);
    expect(isValidOutputPath("project/.config/settings.json")).toBe(false);
    expect(isValidOutputPath("a/b/.ssh/id_rsa")).toBe(false);
  });

  test("rejects paths with parent directory traversal", () => {
    expect(isValidOutputPath("../file.md")).toBe(false);
    expect(isValidOutputPath("sub/../../etc/passwd")).toBe(false);
  });

  test("rejects protected root segments (including bare names)", () => {
    expect(isValidOutputPath("etc/passwd")).toBe(false);
    expect(isValidOutputPath("etc")).toBe(false);
    expect(isValidOutputPath("root/.bashrc")).toBe(false);
    expect(isValidOutputPath("home/user/file.md")).toBe(false);
    expect(isValidOutputPath("usr/bin/claude")).toBe(false);
    expect(isValidOutputPath("var/log/syslog")).toBe(false);
    expect(isValidOutputPath("sys/kernel")).toBe(false);
    expect(isValidOutputPath("proc/self")).toBe(false);
  });

  test("rejects Windows reserved device names at any depth", () => {
    expect(isValidOutputPath("NUL")).toBe(false);
    expect(isValidOutputPath("nul")).toBe(false);
    expect(isValidOutputPath("CON.md")).toBe(false);
    expect(isValidOutputPath("COM1")).toBe(false);
    expect(isValidOutputPath("LPT1")).toBe(false);
    expect(isValidOutputPath("out/NUL")).toBe(false);
    expect(isValidOutputPath("docs/con.txt")).toBe(false);
  });

  test("checkOutputPath returns typed rejection reasons", () => {
    expect(checkOutputPath("C:/Windows/foo.md")).toEqual({ ok: false, reason: "absolute" });
    expect(checkOutputPath("../escape.md")).toEqual({ ok: false, reason: "escape" });
    expect(checkOutputPath(".env")).toEqual({ ok: false, reason: "hidden" });
    expect(checkOutputPath("etc/passwd")).toEqual({ ok: false, reason: "protected" });
    expect(checkOutputPath("analysis.md")).toEqual({ ok: true });
  });
});

describe("isValidGitRef", () => {
  test("accepts common refs", () => {
    expect(isValidGitRef("HEAD")).toBe(true);
    expect(isValidGitRef("HEAD~1")).toBe(true);
    expect(isValidGitRef("main")).toBe(true);
    expect(isValidGitRef("origin/main")).toBe(true);
    expect(isValidGitRef("abc1234")).toBe(true);
  });

  test("rejects shell metacharacters", () => {
    expect(isValidGitRef("main;rm")).toBe(false);
    expect(isValidGitRef("main$(whoami)")).toBe(false);
    expect(isValidGitRef("-rf")).toBe(false);
    expect(isValidGitRef("a..b")).toBe(false);
  });
});

describe("countPlaceholderOccurrences", () => {
  test("counts $@ placeholders", () => {
    expect(countPlaceholderOccurrences("claude")).toBe(0);
    expect(countPlaceholderOccurrences("amp -x 'Review: $@'")).toBe(1);
    expect(countPlaceholderOccurrences("claude -p 'Review $@ and explain $@'")).toBe(2);
  });
});
