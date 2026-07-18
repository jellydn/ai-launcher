import { isAbsolute, normalize } from "node:path";

/** Max length for a single CLI argument passed through the launcher. */
export const MAX_ARGUMENT_LENGTH = 200;

/** Max length for a tool/template command string. */
export const MAX_COMMAND_LENGTH = 500;

/** Max stdin size accepted by the launcher (10 MiB). */
export const MAX_STDIN_BYTES = 10 * 1024 * 1024;

/** Characters allowed in extra CLI arguments. */
const SAFE_ARGUMENT_PATTERN = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;

/**
 * Path segments that must not appear as whole components of relative output paths.
 * Matching whole segments (not substrings) avoids false rejects like `notes/home-review.md`.
 */
const PROTECTED_PATH_SEGMENTS = new Set([
  "etc",
  "root",
  "home",
  "usr",
  "var",
  "sys",
  "proc",
  ".git",
  ".config",
]);

/**
 * Validate extra CLI arguments before they are interpolated into a shell command.
 */
export function validateArguments(args: string[]): boolean {
  return args.every((arg) => SAFE_ARGUMENT_PATTERN.test(arg) && arg.length <= MAX_ARGUMENT_LENGTH);
}

/**
 * Validate a relative output file path for --diff-output (and similar).
 * Rejects absolute paths, traversal, hidden root entries, and protected segments.
 */
export function isValidOutputPath(filePath: string): boolean {
  if (!filePath || filePath.trim().length === 0) {
    return false;
  }

  // Check the raw path before normalize collapses "./foo" → "foo" or ".git/x" stays.
  const raw = filePath.replace(/\\/g, "/");
  if (raw.startsWith(".") || raw.includes("/./") || raw.includes("/../")) {
    return false;
  }

  const normalized = normalize(filePath).replace(/\\/g, "/");

  // Absolute POSIX or Windows paths
  if (isAbsolute(filePath) || isAbsolute(normalized) || normalized.startsWith("/")) {
    return false;
  }
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return false;
  }

  // Directory traversal after normalize
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.endsWith("/..")
  ) {
    return false;
  }

  if (normalized.startsWith(".")) {
    return false;
  }

  const segments = normalized.split("/").filter((segment) => segment.length > 0 && segment !== ".");
  for (const segment of segments) {
    if (segment === "..") {
      return false;
    }
    if (segment.startsWith(".")) {
      return false;
    }
    if (PROTECTED_PATH_SEGMENTS.has(segment.toLowerCase())) {
      return false;
    }
  }

  return true;
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
