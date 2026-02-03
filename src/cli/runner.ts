import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, normalize, resolve } from "node:path";
import { isSafeCommand } from "../template";

const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_VALIDATION_ERROR = 1;
const EXIT_CODE_FILE_WRITE_ERROR = 2;
const EXIT_CODE_PROCESS_ERROR = 3;

function handleChildProcessError(child: SpawnSyncReturns<string | Buffer>): void {
  if (child.error || child.signal) {
    console.error(
      child.error?.message ?? `Process terminated by signal ${child.signal ?? "unknown"}`
    );
    process.exit(EXIT_CODE_PROCESS_ERROR);
  }
}

function isValidOutputPath(filePath: string): boolean {
  const normalized = normalize(filePath);

  if (isAbsolute(normalized)) {
    console.error("Error: Output file path must be relative, not absolute");
    return false;
  }

  const isPathEscape =
    normalized.startsWith("..") || normalized.includes("/../") || normalized.includes("\\..\\");
  if (isPathEscape) {
    console.error("Error: Output file path cannot escape current directory");
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
    /sys\//,
    /proc\//,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(normalized)) {
      console.error("Error: Output file path points to a protected location");
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

  const resolvedPath = resolve(filePath);

  if (existsSync(resolvedPath)) {
    console.error(`Warning: File already exists: ${resolvedPath}`);
    console.error("Use a different filename or remove the existing file first");
    return "File already exists";
  }

  return null;
}

export function validateArguments(args: string[]): boolean {
  const safePattern = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;
  return args.every((arg) => safePattern.test(arg) && arg.length <= 200);
}

export function readStdin(): string | null {
  try {
    const isInteractive = process.stdin.isTTY;
    if (isInteractive) return null;
    return readFileSync(0, "utf-8").trim();
  } catch {
    return null;
  }
}

export function launchTool(
  command: string,
  extraArgs: string[] = [],
  stdinContent: string | null = null
): void {
  if (!isSafeCommand(command)) {
    console.error("Invalid command format");
    process.exit(1);
  }

  if (!validateArguments(extraArgs)) {
    console.error("Invalid argument format");
    process.exit(1);
  }

  const hasArgs = extraArgs.length > 0;
  const hasStdin = stdinContent !== null && stdinContent.length > 0;

  if (command.includes("$@") && !hasArgs && !hasStdin) {
    console.error("This template requires input.");
    console.error("Usage: ai <template> <args...>  OR  <command> | ai <template>");
    process.exit(1);
  }

  const inputString = hasArgs ? extraArgs.join(" ") : (stdinContent ?? "");
  const usesPlaceholder = command.includes("$@");

  const finalCommand = usesPlaceholder
    ? command.replace("$@", inputString)
    : hasArgs || hasStdin
      ? `${command} ${inputString}`
      : command;

  const parts = finalCommand.split(/\s+/).filter((p) => p !== "");
  const [cmd, ...args] = parts;
  if (!cmd) {
    console.error("Empty command");
    process.exit(1);
  }

  const child = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
  });

  handleChildProcessError(child);

  process.exit(child.status ?? EXIT_CODE_SUCCESS);
}

export function launchToolWithPrompt(
  command: string,
  prompt: string,
  useStdin = false,
  outputFile?: string
): never {
  if (!isSafeCommand(command)) {
    console.error("Invalid command format");
    process.exit(1);
  }

  const parts = command.split(/\s+/).filter((p) => p !== "");
  const [cmd, ...args] = parts;
  if (!cmd) {
    console.error("Empty command");
    process.exit(1);
  }

  if (outputFile) {
    const validationError = validateOutputFile(outputFile);
    if (validationError) {
      console.error(`Error: ${validationError}`);
      process.exit(EXIT_CODE_VALIDATION_ERROR);
    }

    const resolvedPath = resolve(outputFile);
    const outputDir = dirname(resolvedPath);

    if (!existsSync(outputDir)) {
      console.error(`Error: Output directory does not exist: ${outputDir}`);
      process.exit(EXIT_CODE_VALIDATION_ERROR);
    }

    let child: SpawnSyncReturns<string>;

    if (useStdin) {
      child = spawnSync(cmd, args, {
        input: prompt,
        stdio: ["pipe", "pipe", "inherit"],
        shell: true,
        encoding: "utf-8",
      });
    } else {
      const escapedPrompt = prompt.replace(/'/g, "'\\''");
      const finalCommand = `${command} '${escapedPrompt}'`;

      child = spawnSync("sh", ["-c", finalCommand], {
        stdio: ["inherit", "pipe", "inherit"],
        encoding: "utf-8",
      });
    }

    handleChildProcessError(child);

    const output = child.stdout || "";

    try {
      writeFileSync(resolvedPath, output);
      const fileSize = Buffer.byteLength(output, "utf-8");
      console.log(`\n✅ Analysis saved to: ${resolvedPath} (${fileSize} bytes)`);
    } catch (error) {
      console.error(`\n❌ Failed to write output to ${resolvedPath}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(EXIT_CODE_FILE_WRITE_ERROR);
    }

    process.exit(child.status ?? EXIT_CODE_SUCCESS);
  }

  if (useStdin) {
    const child = spawnSync(cmd, args, {
      input: prompt,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    }) as SpawnSyncReturns<string | Buffer>;

    handleChildProcessError(child);

    process.exit(child.status ?? 0);
  }

  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const finalCommand = `${command} '${escapedPrompt}'`;

  const child = spawnSync("sh", ["-c", finalCommand], {
    stdio: "inherit",
  }) as SpawnSyncReturns<string | Buffer>;

  handleChildProcessError(child);

  process.exit(child.status ?? 0);
}
