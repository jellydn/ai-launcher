import { beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  launchTool,
  launchToolWithPrompt,
  readStdin,
  validateArguments,
} from "./runner";

// Mock dependencies
const mockSpawnSync = mock(() => ({ status: 0, stdout: "", stderr: "", error: undefined }));
const mockExistsSync = mock(() => false);
const mockWriteFileSync = mock(() => {});
const mockReadFileSync = mock(() => "");

describe("cli/runner module", () => {
  beforeEach(() => {
    mockSpawnSync.mockClear();
    mockExistsSync.mockClear();
    mockWriteFileSync.mockClear();
    mockReadFileSync.mockClear();

    // Mock process.stdin.isTTY to true (interactive mode) by default
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
  });

  describe("validateArguments", () => {
    test("returns true for empty array", () => {
      // Arrange
      const args: string[] = [];

      // Act
      const result = validateArguments(args);

      // Assert
      expect(result).toBe(true);
    });

    test("returns true for simple valid arguments", () => {
      // Arrange
      const args = ["--help", "-v", "--model", "gpt-4"];

      // Act
      const result = validateArguments(args);

      // Assert
      expect(result).toBe(true);
    });

    test("returns true for arguments with special characters", () => {
      // Arrange
      const args = [
        "--config=myconfig.json",
        "[test]",
        "{key:value}",
        "@file.txt",
        "src/index.ts",
      ];

      // Act
      const result = validateArguments(args);

      // Assert
      expect(result).toBe(true);
    });

    test("returns true for arguments with quotes and equals", () => {
      // Arrange
      const args = ['--prompt="hello world"', '--output=output.md', '--name="test"'];

      // Act
      const result = validateArguments(args);

      // Assert
      expect(result).toBe(true);
    });

    test("returns false for arguments with semicolon", () => {
      // Arrange
      const args = ["--help; rm -rf /"];

      // Act
      const result = validateArguments(args);

      // Assert
      expect(result).toBe(false);
    });

    test("returns false for arguments with pipe", () => {
      // Arrange
      const args = ["--help | cat"];

      // Act
      const result = validateArguments(args);

      // Assert
      expect(result).toBe(false);
    });

    test("returns false for arguments exceeding max length", () => {
      // Arrange
      const longArg = "a".repeat(201);
      const args = [longArg];

      // Act
      const result = validateArguments(args);

      // Assert
      expect(result).toBe(false);
    });

    test("returns false if any argument is invalid", () => {
      // Arrange
      const args = ["valid", "also-valid", "invalid; rm -rf /"];

      // Act
      const result = validateArguments(args);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("readStdin", () => {
    test("returns null when in interactive TTY mode", () => {
      // Arrange
      Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });

      // Act
      const result = readStdin();

      // Assert
      expect(result).toBeNull();
    });

    test("returns null when reading stdin throws error", () => {
      // Arrange
      Object.defineProperty(process.stdin, "isTTY", { value: false, writable: true });
      const originalReadFileSync = readFileSync;
      global.readFileSync = mock(() => {
        throw new Error("Not readable");
      }) as unknown as typeof readFileSync;

      // Act
      const result = readStdin();

      // Assert
      expect(result).toBeNull();

      // Cleanup
      global.readFileSync = originalReadFileSync;
    });
  });

  describe("launchTool", () => {
    test("exits with error when command is empty", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchTool("", []);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Empty command");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with error for unsafe command", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchTool("claude; rm -rf /", []);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Invalid command format");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with error for invalid arguments", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchTool("claude", ["--help; rm -rf /"]);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Invalid argument format");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with error when template requires input but none provided", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchTool("amp -x 'Review: $@'", []);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("This template requires input.");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });
  });

  describe("launchToolWithPrompt", () => {
    test("exits with error when command is empty", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchToolWithPrompt("", "some prompt");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Empty command");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with error for unsafe command", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchToolWithPrompt("claude; rm -rf /", "some prompt");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Invalid command format");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });
  });

  describe("launchToolWithPrompt with output file", () => {
    test("exits with validation error for empty output file path", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchToolWithPrompt("claude", "prompt", false, "");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Error: Output file path cannot be empty");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with validation error for absolute output path", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchToolWithPrompt("claude", "prompt", false, "/etc/passwd");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Error: Invalid output file path");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with validation error for path escaping directory", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchToolWithPrompt("claude", "prompt", false, "../secret.md");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Error: Invalid output file path");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with validation error for hidden file paths", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchToolWithPrompt("claude", "prompt", false, ".hidden.md");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Error: Invalid output file path");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with validation error for paths to protected directories", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      launchToolWithPrompt("claude", "prompt", false, ".git/config");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("Error: Invalid output file path");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test("exits with validation error when output file already exists", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;
      const originalExistsSync = existsSync;
      global.existsSync = mock(() => true) as typeof existsSync;

      // Act
      launchToolWithPrompt("claude", "prompt", false, "analysis.md");

      // Assert
      expect(errorSpy).toHaveBeenCalled();
      const errorMessage = errorSpy.mock.calls[0][0] as string;
      expect(errorMessage).toContain("Warning: File already exists");
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
      global.existsSync = originalExistsSync;
    });

    test("exits with validation error when output directory does not exist", () => {
      // Arrange
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;
      const originalExistsSync = existsSync;
      const existsMock = mock((path: string) => {
        // Return true for the file (to pass first check), false for directory
        if (path.includes(resolve("output"))) {
          return false;
        }
        return false;
      });
      global.existsSync = existsMock as unknown as typeof existsSync;

      // Act
      launchToolWithPrompt("claude", "prompt", false, "output/analysis.md");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        "Error: Output directory does not exist: " + resolve("output")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
      global.existsSync = originalExistsSync;
    });
  });

  describe("isValidOutputPath (via launchToolWithPrompt)", () => {
    const validTestCases = [
      { path: "analysis.md", description: "simple relative path" },
      { path: "output/results.md", description: "relative path with subdirectory" },
      { path: "docs/reports/2024/analysis.md", description: "nested relative path" },
      { path: "file-with-dashes.txt", description: "filename with dashes" },
      { path: "file_with_underscores.txt", description: "filename with underscores" },
      { path: "file.with.dots.txt", description: "filename with multiple dots" },
    ];

    for (const testCase of validTestCases) {
      test(`accepts ${testCase.description}: ${testCase.path}`, () => {
        // Arrange
        const originalExit = process.exit;
        const exitSpy = mock(() => {});
        process.exit = exitSpy;
        const originalExistsSync = existsSync;
        const originalWriteFileSync = writeFileSync;
        const originalSpawnSync = spawnSync;
        global.existsSync = mock(() => false) as typeof existsSync;
        global.writeFileSync = mock(() => {}) as typeof writeFileSync;
        global.spawnSync = mock(() => ({
          status: 0,
          stdout: "output",
          stderr: "",
          error: undefined,
        })) as typeof spawnSync;
        const originalConsoleLog = console.log;
        const logSpy = mock(() => {});
        console.log = logSpy;

        // Act - should not exit early (path is valid)
        // We catch the process.exit to prevent actual test exit
        let exitCode: number | undefined;
        exitSpy.mockImplementation((code?: number) => {
          exitCode = code;
        });

        try {
          launchToolWithPrompt("claude", "prompt", false, testCase.path);

          // Assert - If we get here without early exit, path validation passed
          // The function should exit normally after writing file
          expect(exitCode).toBe(0);
        } catch {
          // If early exit with validation error, that's a problem
          expect.fail(`Should have accepted valid path: ${testCase.path}`);
        }

        // Cleanup
        process.exit = originalExit;
        console.log = originalConsoleLog;
        global.existsSync = originalExistsSync;
        global.writeFileSync = originalWriteFileSync;
        global.spawnSync = originalSpawnSync;
      });
    }

    const invalidTestCases = [
      { path: "/absolute/path.md", description: "absolute path" },
      { path: "../escape.md", description: "parent directory traversal" },
      { path: "sub/../../escape.md", description: "nested parent traversal" },
      { path: ".hidden.md", description: "hidden file" },
      { path: "./hidden.md", description: "hidden file with ./ prefix" },
      { path: ".git/config", description: "git config path" },
      { path: ".config/settings.json", description: "config directory path" },
      { path: "etc/passwd", description: "etc directory path" },
      { path: "root/.bashrc", description: "root directory path" },
    ];

    for (const testCase of invalidTestCases) {
      test(`rejects ${testCase.description}: ${testCase.path}`, () => {
        // Arrange
        const originalExit = process.exit;
        const exitSpy = mock(() => {});
        process.exit = exitSpy;
        const originalConsoleError = console.error;
        const errorSpy = mock(() => {});
        console.error = errorSpy;

        // Act
        launchToolWithPrompt("claude", "prompt", false, testCase.path);

        // Assert
        expect(errorSpy).toHaveBeenCalled();
        const errorMessage = errorSpy.mock.calls[0][0] as string;
        expect(errorMessage).toContain("Error:");
        expect(exitSpy).toHaveBeenCalledWith(1);

        // Cleanup
        process.exit = originalExit;
        console.error = originalConsoleError;
      });
    }
  });
});
