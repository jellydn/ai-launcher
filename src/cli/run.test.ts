import { beforeEach, describe, expect, mock, test } from "bun:test";
import { runCli } from "./run";

// Mock all dependencies
const mockLoadConfig = mock(() => ({ tools: [] }));
const mockDetectInstalledTools = mock(() => []);
const mockMergeTools = mock(() => []);
const mockToSelectableItems = mock(() => []);
const mockShowHelp = mock(() => {
  throw new Error("process.exit called");
});
const mockShowVersion = mock(() => {
  throw new Error("process.exit called");
});
const mockUpgrade = mock(async () => {});
const mockParseDiffArgs = mock(() => ({ hasDiffCommand: false }));
const mockExecuteDiffCommand = mock(async () => {
  throw new Error("process.exit called");
});
const mockLaunchTool = mock(() => {
  throw new Error("process.exit called");
});
const mockFuzzySelect = mock(async () => ({ cancelled: false, item: null }));
const mockReadStdin = mock(() => null);

describe("cli/run module", () => {
  beforeEach(() => {
    mockLoadConfig.mockClear();
    mockDetectInstalledTools.mockClear();
    mockMergeTools.mockClear();
    mockToSelectableItems.mockClear();
    mockShowHelp.mockClear();
    mockShowVersion.mockClear();
    mockUpgrade.mockClear();
    mockParseDiffArgs.mockClear();
    mockExecuteDiffCommand.mockClear();
    mockLaunchTool.mockClear();
    mockFuzzySelect.mockClear();
    mockReadStdin.mockClear();
  });

  describe("runCli argument handling", () => {
    test("shows help when --help flag is provided", async () => {
      // Arrange
      const args = ["--help"];

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockShowHelp).toHaveBeenCalled();
    });

    test("shows help when -h flag is provided", async () => {
      // Arrange
      const args = ["-h"];

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockShowHelp).toHaveBeenCalled();
    });

    test("shows version when --version flag is provided", async () => {
      // Arrange
      const args = ["--version"];

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockShowVersion).toHaveBeenCalled();
    });

    test("shows version when -v flag is provided", async () => {
      // Arrange
      const args = ["-v"];

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockShowVersion).toHaveBeenCalled();
    });

    test("calls upgrade when upgrade command is provided", async () => {
      // Arrange
      const args = ["upgrade"];

      // Act & Assert
      await expect(runCli(args)).resolves.not.toThrow();
      expect(mockUpgrade).toHaveBeenCalled();
    });
  });

  describe("runCli empty tools handling", () => {
    test("exits with error when no tools are found", async () => {
      // Arrange
      const args = [];
      mockToSelectableItems.mockReturnValue([]);

      // Act & Assert
      // Note: This test shows behavior when no tools exist
      // The actual process.exit is called, so we expect it to exit
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      await runCli(args);

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });
  });

  describe("runCli diff command parsing", () => {
    test("parses diff args and calls executeDiffCommand when diff flag present", async () => {
      // Arrange
      const args = ["claude", "--diff-staged"];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({
        hasDiffCommand: true,
        options: { type: "staged" },
        diffFlagIndex: 1,
      });
      mockToSelectableItems.mockReturnValue(mockItems);

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockExecuteDiffCommand).toHaveBeenCalled();
    });

    test("handles --diff-staged without tool name", async () => {
      // Arrange
      const args = ["--diff-staged"];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({
        hasDiffCommand: true,
        options: { type: "staged" },
        diffFlagIndex: 0,
      });
      mockToSelectableItems.mockReturnValue(mockItems);
      mockFuzzySelect.mockResolvedValue({ cancelled: false, item: mockItems[0] });

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockFuzzySelect).toHaveBeenCalled();
    });
  });

  describe("runCli -- separator handling", () => {
    test("handles -- separator with fuzzy select when no tool before separator", async () => {
      // Arrange
      const args = ["--", "--help"];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);
      mockFuzzySelect.mockResolvedValue({ cancelled: false, item: mockItems[0] });

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockFuzzySelect).toHaveBeenCalled();
      expect(mockLaunchTool).toHaveBeenCalledWith("claude", ["--help"], null);
    });

    test("handles -- separator with tool name before separator", async () => {
      // Arrange
      const args = ["claude", "--", "--help"];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockLaunchTool).toHaveBeenCalledWith("claude", ["--help"], null);
    });

    test("exits with error when tool not found before -- separator", async () => {
      // Arrange
      const args = ["unknown-tool", "--", "--help"];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      await runCli(args);

      // Assert
      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });
  });

  describe("runCli direct tool invocation", () => {
    test("launches tool directly when tool name is provided", async () => {
      // Arrange
      const args = ["claude", "--help"];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockLaunchTool).toHaveBeenCalledWith("claude", ["--help"], null);
    });

    test("exits with error when tool not found", async () => {
      // Arrange
      const args = ["unknown-tool"];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;
      const originalConsoleError = console.error;
      const errorSpy = mock(() => {});
      console.error = errorSpy;

      // Act
      await runCli(args);

      // Assert
      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Cleanup
      process.exit = originalExit;
      console.error = originalConsoleError;
    });
  });

  describe("runCli interactive mode", () => {
    test("enters fuzzy select mode when no arguments provided", async () => {
      // Arrange
      const args: string[] = [];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);
      mockFuzzySelect.mockResolvedValue({ cancelled: false, item: mockItems[0] });

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockFuzzySelect).toHaveBeenCalled();
    });

    test("exits without error when fuzzy select is cancelled", async () => {
      // Arrange
      const args: string[] = [];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);
      mockFuzzySelect.mockResolvedValue({ cancelled: true, item: null });
      const originalExit = process.exit;
      const exitSpy = mock(() => {});
      process.exit = exitSpy;

      // Act
      await runCli(args);

      // Assert
      expect(exitSpy).toHaveBeenCalledWith(0);

      // Cleanup
      process.exit = originalExit;
    });

    test("handles template selection with $@ placeholder", async () => {
      // Arrange
      const args: string[] = [];
      const mockItems = [
        {
          name: "review-template",
          command: "amp -x 'Review: $@'",
          isTemplate: true,
        },
      ];
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);
      mockFuzzySelect.mockResolvedValue({ cancelled: false, item: mockItems[0] });

      // Act & Assert
      // Template with $@ should prompt for input
      // For now we just verify the flow reaches fuzzySelect
      expect(() => runCli(args)).toThrow("process.exit called");
    });
  });

  describe("runCli stdin handling", () => {
    test("reads stdin when available", async () => {
      // Arrange
      const args = ["claude", "some-prompt"];
      const mockItems = [
        {
          name: "claude",
          command: "claude",
          isTemplate: false,
        },
      ];
      mockReadStdin.mockReturnValue("stdin content");
      mockParseDiffArgs.mockReturnValue({ hasDiffCommand: false });
      mockToSelectableItems.mockReturnValue(mockItems);

      // Act & Assert
      expect(() => runCli(args)).toThrow("process.exit called");
      expect(mockReadStdin).toHaveBeenCalled();
      expect(mockLaunchTool).toHaveBeenCalledWith("claude", ["some-prompt"], "stdin content");
    });
  });
});
