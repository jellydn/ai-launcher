import { describe, expect, test } from "bun:test";

function validateToolCommand(command: string): boolean {
  const safePattern = /^[a-zA-Z0-9._\s\-"':,!?/\\|$@]+$/;
  return safePattern.test(command.trim()) && command.length > 0 && command.length <= 500;
}

function validateArguments(args: string[]): boolean {
  const safePattern = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;
  return args.every((arg) => safePattern.test(arg) && arg.length <= 200);
}

describe("validateToolCommand", () => {
  test("accepts simple command", () => {
    expect(validateToolCommand("claude")).toBe(true);
  });

  test("accepts command with dashes", () => {
    expect(validateToolCommand("open-code")).toBe(true);
  });

  test("accepts command with path", () => {
    expect(validateToolCommand("/usr/local/bin/claude")).toBe(true);
  });

  test("accepts template command with quotes and $@", () => {
    expect(validateToolCommand("amp -x 'Review: $@'")).toBe(true);
  });

  test("accepts command with special template chars", () => {
    expect(validateToolCommand("claude 'What does this do?'")).toBe(true);
    expect(validateToolCommand('amp -x "Explain: $@"')).toBe(true);
  });

  test("rejects empty command", () => {
    expect(validateToolCommand("")).toBe(false);
  });

  test("rejects command with semicolon", () => {
    expect(validateToolCommand("claude; rm -rf /")).toBe(false);
  });

  test("rejects command with &&", () => {
    expect(validateToolCommand("claude && echo pwned")).toBe(false);
  });

  test("rejects command with backticks", () => {
    expect(validateToolCommand("claude `whoami`")).toBe(false);
  });

  test("rejects command with $()", () => {
    expect(validateToolCommand("claude $(whoami)")).toBe(false);
  });

  test("rejects command exceeding max length", () => {
    const longCommand = "a".repeat(501);
    expect(validateToolCommand(longCommand)).toBe(false);
  });

  test("accepts command at max length", () => {
    const maxCommand = "a".repeat(500);
    expect(validateToolCommand(maxCommand)).toBe(true);
  });
});

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

describe("Argument Parsing Logic", () => {
  function parseArgs(argv: string[]): {
    toolQuery: string | null;
    extraArgs: string[];
    dashSeparator: boolean;
    beforeDash: string[];
    afterDash: string[];
  } {
    const dashIndex = argv.indexOf("--");
    if (dashIndex !== -1) {
      return {
        toolQuery: argv[0] ?? null,
        extraArgs: [],
        dashSeparator: true,
        beforeDash: argv.slice(0, dashIndex),
        afterDash: argv.slice(dashIndex + 1),
      };
    }
    return {
      toolQuery: argv[0] ?? null,
      extraArgs: argv.slice(1),
      dashSeparator: false,
      beforeDash: [],
      afterDash: [],
    };
  }

  test("parses tool name only", () => {
    const result = parseArgs(["claude"]);
    expect(result.toolQuery).toBe("claude");
    expect(result.extraArgs).toEqual([]);
  });

  test("parses tool name with args", () => {
    const result = parseArgs(["claude", "--help"]);
    expect(result.toolQuery).toBe("claude");
    expect(result.extraArgs).toEqual(["--help"]);
  });

  test("parses -- separator with tool before", () => {
    const result = parseArgs(["claude", "--", "--version"]);
    expect(result.dashSeparator).toBe(true);
    expect(result.beforeDash).toEqual(["claude"]);
    expect(result.afterDash).toEqual(["--version"]);
  });

  test("parses -- separator without tool", () => {
    const result = parseArgs(["--", "--help"]);
    expect(result.dashSeparator).toBe(true);
    expect(result.beforeDash).toEqual([]);
    expect(result.afterDash).toEqual(["--help"]);
  });

  test("parses empty args", () => {
    const result = parseArgs([]);
    expect(result.toolQuery).toBe(null);
    expect(result.extraArgs).toEqual([]);
  });

  test("parses multiple args after tool", () => {
    const result = parseArgs(["amp", "-x", "hello", "world"]);
    expect(result.toolQuery).toBe("amp");
    expect(result.extraArgs).toEqual(["-x", "hello", "world"]);
  });

  test("parses multiple args after --", () => {
    const result = parseArgs(["rev", "--", "arg1", "arg2", "arg3"]);
    expect(result.beforeDash).toEqual(["rev"]);
    expect(result.afterDash).toEqual(["arg1", "arg2", "arg3"]);
  });
});

describe("Output Path Validation", () => {
  function isValidOutputPath(path: string): boolean {
    const normalized = path.replace(/\\/g, "/");

    if (normalized.startsWith("/")) {
      return false;
    }

    if (normalized.startsWith("..") || normalized.includes("/../")) {
      return false;
    }

    const forbiddenPatterns = [
      /^\./,
      /\.git\//,
      /\.config\//,
      /etc\//,
      /root\//,
      /home\//,
      /usr\//,
      /var\//,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(normalized)) {
        return false;
      }
    }

    return true;
  }

  function validateOutputFile(filePath: string): string | null {
    if (!filePath || filePath.trim().length === 0) {
      return "Output file path cannot be empty";
    }

    if (!isValidOutputPath(filePath)) {
      return "Invalid output file path";
    }

    return null;
  }

  test("accepts simple relative path", () => {
    expect(isValidOutputPath("analysis.md")).toBe(true);
    expect(isValidOutputPath("output.txt")).toBe(true);
  });

  test("accepts relative path with subdirectory", () => {
    expect(isValidOutputPath("results/analysis.md")).toBe(true);
    expect(isValidOutputPath("docs/output.txt")).toBe(true);
  });

  test("rejects absolute paths", () => {
    expect(isValidOutputPath("/etc/passwd")).toBe(false);
    expect(isValidOutputPath("/home/user/file.md")).toBe(false);
    expect(isValidOutputPath("/tmp/output.txt")).toBe(false);
  });

  test("rejects paths starting with dot", () => {
    expect(isValidOutputPath(".hidden.md")).toBe(false);
    expect(isValidOutputPath("./secret.txt")).toBe(false);
  });

  test("rejects paths with parent directory traversal", () => {
    expect(isValidOutputPath("../file.md")).toBe(false);
    expect(isValidOutputPath("sub/../../etc/passwd")).toBe(false);
    expect(isValidOutputPath("..%2F..%2Fetc%2Fpasswd")).toBe(false);
  });

  test("rejects paths to protected directories", () => {
    expect(isValidOutputPath(".git/config")).toBe(false);
    expect(isValidOutputPath(".config/settings.json")).toBe(false);
    expect(isValidOutputPath("etc/passwd")).toBe(false);
    expect(isValidOutputPath("root/.bashrc")).toBe(false);
    expect(isValidOutputPath("home/user/file.md")).toBe(false);
    expect(isValidOutputPath("usr/bin/claude")).toBe(false);
    expect(isValidOutputPath("var/log/syslog")).toBe(false);
  });

  test("validateOutputFile returns null for valid path", () => {
    expect(validateOutputFile("analysis.md")).toBeNull();
    expect(validateOutputFile("docs/output.txt")).toBeNull();
  });

  test("validateOutputFile returns error for empty path", () => {
    expect(validateOutputFile("")).toBe("Output file path cannot be empty");
    expect(validateOutputFile("   ")).toBe("Output file path cannot be empty");
  });

  test("validateOutputFile returns error for invalid path", () => {
    expect(validateOutputFile("/etc/passwd")).toBe("Invalid output file path");
    expect(validateOutputFile("../file.md")).toBe("Invalid output file path");
  });
});
