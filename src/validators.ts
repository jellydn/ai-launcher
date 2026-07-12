// Shared input validators used by both the CLI and its tests.
// Keeping a single implementation here avoids drift between the security
// checks enforced at runtime and the behavior asserted in tests.

const ARGUMENT_SAFE_PATTERN = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;
const MAX_ARGUMENT_LENGTH = 200;

export function validateArguments(args: string[]): boolean {
  return args.every((arg) => ARGUMENT_SAFE_PATTERN.test(arg) && arg.length <= MAX_ARGUMENT_LENGTH);
}

// Patterns are anchored to the start of the (normalized) relative path so that
// a legitimate nested directory (e.g. "project/etc/config.md") is not rejected
// just because it contains a protected name as a substring.
const FORBIDDEN_OUTPUT_PATH_PATTERNS = [
  /^\./, // hidden files/dirs (includes .git, .config, ...)
  /^etc\//,
  /^root\//,
  /^home\//,
  /^usr\//,
  /^var\//,
  /^sys\//,
  /^proc\//,
];

export function isValidOutputPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");

  if (normalized.startsWith("/")) {
    return false;
  }

  if (normalized.startsWith("..") || normalized.includes("/../")) {
    return false;
  }

  return !FORBIDDEN_OUTPUT_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}
