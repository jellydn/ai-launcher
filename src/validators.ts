import { posix, win32 } from "node:path";

/** Max length for a single CLI argument passed through the launcher. */
export const MAX_ARGUMENT_LENGTH = 200;

/** Max length for a tool/template command string. */
export const MAX_COMMAND_LENGTH = 500;

/** Max stdin size accepted by the launcher (10 MiB). */
export const MAX_STDIN_BYTES = 10 * 1024 * 1024;

/** Characters allowed in extra CLI arguments. */
const SAFE_ARGUMENT_PATTERN = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;

/**
 * First path segment names that map to sensitive system directories.
 * Only the leading segment is checked: a relative `project/etc/config.md`
 * is not the system `/etc` (intentional relaxation of the old substring match).
 */
const PROTECTED_ROOT_SEGMENTS = new Set(["etc", "root", "home", "usr", "var", "sys", "proc"]);

export type OutputPathRejection = "absolute" | "escape" | "hidden" | "protected";
export type OutputPathValidation = { ok: true } | { ok: false; reason: OutputPathRejection };

/**
 * Validate extra CLI arguments before they are interpolated into a shell command.
 */
export function validateArguments(args: string[]): boolean {
  return args.every((arg) => SAFE_ARGUMENT_PATTERN.test(arg) && arg.length <= MAX_ARGUMENT_LENGTH);
}

function isAbsolutePath(filePath: string, normalized: string): boolean {
  // Reject both POSIX and Windows absolute forms regardless of host OS so
  // unit tests on macOS/Linux still cover Windows paths, and Windows itself
  // is protected (drive-letter and UNC forms).
  return (
    posix.isAbsolute(normalized) ||
    win32.isAbsolute(filePath) ||
    win32.isAbsolute(normalized) ||
    /^[A-Za-z]:/.test(normalized)
  );
}

/**
 * Policy is an explicit path-segment model:
 * normalize separators, strip a leading `./`, reject absolute paths, then walk
 * segments rejecting traversal, hidden entries at any depth, and protected roots.
 */
export function checkOutputPath(filePath: string): OutputPathValidation {
  if (!filePath || filePath.trim().length === 0) {
    return { ok: false, reason: "escape" };
  }

  let normalized = filePath.replace(/\\/g, "/");
  // Allow an explicit relative prefix (./output.md) without treating it as hidden.
  while (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  if (!normalized || normalized === ".") {
    return { ok: false, reason: "escape" };
  }

  if (isAbsolutePath(filePath, normalized)) {
    return { ok: false, reason: "absolute" };
  }

  const segments = normalized.split("/").filter((segment) => segment.length > 0);

  for (const segment of segments) {
    if (segment === "..") {
      return { ok: false, reason: "escape" };
    }
    // Hidden files/dirs at any depth (.git, .config, .env, …)
    if (segment.startsWith(".")) {
      return { ok: false, reason: "hidden" };
    }
  }

  const firstSegment = segments[0];
  if (firstSegment && PROTECTED_ROOT_SEGMENTS.has(firstSegment.toLowerCase())) {
    return { ok: false, reason: "protected" };
  }

  return { ok: true };
}

/**
 * Validate a relative output file path for --diff-output (and similar).
 */
export function isValidOutputPath(filePath: string): boolean {
  return checkOutputPath(filePath).ok;
}

/**
 * Validate git reference format to prevent injection into git commands.
 */
export function isValidGitRef(ref: string): boolean {
  const validRefPattern = /^[a-zA-Z0-9._\-/~^@{}]+$/;
  return (
    validRefPattern.test(ref) &&
    !ref.startsWith("-") &&
    !ref.includes("..") &&
    !/[;&|`$()<>[\]]/.test(ref)
  );
}

/**
 * Count $@ placeholders in a template command.
 */
export function countPlaceholderOccurrences(command: string): number {
  return (command.match(/\$@/g) ?? []).length;
}
