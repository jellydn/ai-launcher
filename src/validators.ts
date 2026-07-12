// Shared input validators used by both the CLI and its tests.
// Keeping a single implementation here avoids drift between the security
// checks enforced at runtime and the behavior asserted in tests.

const ARGUMENT_SAFE_PATTERN = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;
const MAX_ARGUMENT_LENGTH = 200;

export function validateArguments(args: string[]): boolean {
  return args.every((arg) => ARGUMENT_SAFE_PATTERN.test(arg) && arg.length <= MAX_ARGUMENT_LENGTH);
}

// System-directory patterns are anchored to the start of the (normalized)
// relative path so that a legitimate nested directory (e.g.
// "project/etc/config.md") is not rejected merely for containing a protected
// name as a substring. Hidden files/dirs are blocked at any depth so that
// writes into ".git"/".config" (including nested, e.g. "sub/.git/hooks/...")
// remain forbidden.
const FORBIDDEN_OUTPUT_PATH_PATTERNS = [
  /^\./, // hidden file/dir at the root (.git, .config, ...)
  /\/\.[^/]/, // hidden file/dir nested anywhere (e.g. "sub/.git/hooks")
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
