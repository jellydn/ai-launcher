import { beforeEach, describe, expect, mock, test } from "bun:test";
import { showHelp, showVersion } from "./help";

// Mock process.exit and console.log
const mockExit = mock(() => {});
const mockLog = mock(() => {});

describe("cli/help module", () => {
  beforeEach(() => {
    mockExit.mockClear();
    mockLog.mockClear();
  });

  describe("showVersion", () => {
    test("exits with code 0", () => {
      // Arrange: Mock process.exit to capture the exit code
      const originalExit = process.exit;
      const exitSpy = mock((code?: number) => {
        mockExit(code);
      });
      process.exit = exitSpy;

      // Act: Call showVersion
      showVersion();

      // Assert: Verify exit was called with 0
      expect(exitSpy).toHaveBeenCalledWith(0);

      // Cleanup
      process.exit = originalExit;
    });

    test("logs version with correct format", () => {
      // Arrange: Mock console.log to capture output
      const originalLog = console.log;
      const logSpy = mock((...args: unknown[]) => {
        mockLog(...args);
      });
      console.log = logSpy;

      // Arrange: Mock process.exit to prevent actual exit
      const originalExit = process.exit;
      process.exit = mock(() => {});

      // Act: Call showVersion
      showVersion();

      // Assert: Verify log was called with version format
      expect(logSpy).toHaveBeenCalled();
      const logArg = logSpy.mock.calls[0][0] as string;
      expect(logArg).toMatch(/^ai-launcher v/);

      // Cleanup
      console.log = originalLog;
      process.exit = originalExit;
    });

    test("never returns (exits process)", () => {
      // Arrange: Mock process.exit
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;

      // Act: Call showVersion
      const result = showVersion();

      // Assert: The function never returns (exit is always called)
      // TypeScript: never return type means function never completes normally
      expect(exitSpy).toHaveBeenCalled();

      // Cleanup
      process.exit = originalExit;
    });
  });

  describe("showHelp", () => {
    test("exits with code 0", () => {
      // Arrange: Mock process.exit
      const originalExit = process.exit;
      const exitSpy = mock((code?: number) => {
        mockExit(code);
      });
      process.exit = exitSpy;

      // Act: Call showHelp
      showHelp();

      // Assert: Verify exit was called with 0
      expect(exitSpy).toHaveBeenCalledWith(0);

      // Cleanup
      process.exit = originalExit;
    });

    test("logs help text with required sections", () => {
      // Arrange: Mock console.log
      const originalLog = console.log;
      const logSpy = mock((...args: unknown[]) => {
        mockLog(...args);
      });
      console.log = logSpy;

      // Arrange: Mock process.exit
      const originalExit = process.exit;
      process.exit = mock(() => {});

      // Act: Call showHelp
      showHelp();

      // Assert: Verify help content includes key sections
      expect(logSpy).toHaveBeenCalled();
      const calls = logSpy.mock.calls;
      const allArgs = calls.map((call) => call[0] as string).join(" ");

      // Assert: Check for required help sections
      expect(allArgs).toContain("USAGE:");
      expect(allArgs).toContain("OPTIONS:");
      expect(allArgs).toContain("EXAMPLES:");
      expect(allArgs).toContain("CONFIG:");

      // Assert: Check for key commands
      expect(allArgs).toContain("--help");
      expect(allArgs).toContain("--version");
      expect(allArgs).toContain("--diff-staged");
      expect(allArgs).toContain("--diff-commit");
      expect(allArgs).toContain("upgrade");

      // Cleanup
      console.log = originalLog;
      process.exit = originalExit;
    });

    test("includes usage examples in help text", () => {
      // Arrange: Mock console.log
      const originalLog = console.log;
      const logSpy = mock((...args: unknown[]) => {
        mockLog(...args);
      });
      console.log = logSpy;

      // Arrange: Mock process.exit
      const originalExit = process.exit;
      process.exit = mock(() => {});

      // Act: Call showHelp
      showHelp();

      // Assert: Verify examples section contains practical usage
      const calls = logSpy.mock.calls;
      const allArgs = calls.map((call) => call[0] as string).join(" ");

      expect(allArgs).toContain("ai claude");
      expect(allArgs).toContain("ai -- --version");
      expect(allArgs).toContain("ai --diff-staged");
      expect(allArgs).toContain("ai upgrade");

      // Cleanup
      console.log = originalLog;
      process.exit = originalExit;
    });

    test("includes config file path in help", () => {
      // Arrange: Mock console.log
      const originalLog = console.log;
      const logSpy = mock((...args: unknown[]) => {
        mockLog(...args);
      });
      console.log = logSpy;

      // Arrange: Mock process.exit
      const originalExit = process.exit;
      process.exit = mock(() => {});

      // Act: Call showHelp
      showHelp();

      // Assert: Verify config path is mentioned
      const calls = logSpy.mock.calls;
      const allArgs = calls.map((call) => call[0] as string).join(" ");

      expect(allArgs).toContain("~/.config/ai-launcher/config.json");

      // Cleanup
      console.log = originalLog;
      process.exit = originalExit;
    });
  });
});
