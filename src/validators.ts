// Shared input validators used by both the CLI and its tests.
// Keeping a single implementation here avoids drift between the security
// checks enforced at runtime and the behavior asserted in tests.

import { posix, win32 } from "node:path";

const ARGUMENT_SAFE_PATTERN = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;
const MAX_ARGUMENT_LENGTH = 200;

export function validateArguments(args: string[]): boolean {
  return args.every((arg) => ARGUMENT_SAFE_PATTERN.test(arg) && arg.length <= MAX_ARGUMENT_LENGTH);
}

export type OutputPathRejection = "absolute" | "escape" | "hidden" | "protected";
export type OutputPathValidation = { ok: true } | { ok: false; reason: OutputPathRejection };

// First path segment names that map to sensitive system directories. Only the
// leading segment matters: a relative "./etc/foo" is not the system "/etc".
const PROTECTED_ROOT_SEGMENTS = new Set(["etc", "root", "home", "usr", "var", "sys", "proc"]);

function isAbsolutePath(filePath: string, normalized: string): boolean {
  // Reject both POSIX and Windows absolute forms regardless of the host OS, so
  // the check is correct on Windows (the platform this hardening targets) and
  // unit tests on macOS/Linux still exercise Windows paths.
  return (
    posix.isAbsolute(normalized) ||
    win32.isAbsolute(filePath) ||
    win32.isAbsolute(normalized) ||
    /^[A-Za-z]:/.test(normalized)
  );
}

// Policy is expressed as an explicit path-segment model rather than a growing
// matrix of anchored regexes: normalize separators, reject absolute paths, then
// walk the segments rejecting traversal, hidden entries, and protected roots.
export function checkOutputPath(filePath: string): OutputPathValidation {
  const normalized = filePath.replace(/\\/g, "/");

  if (isAbsolutePath(filePath, normalized)) {
    return { ok: false, reason: "absolute" };
  }

  const segments = normalized.split("/").filter((segment) => segment.length > 0);

  for (const segment of segments) {
    if (segment === "..") {
      return { ok: false, reason: "escape" };
    }
    if (segment.startsWith(".")) {
      return { ok: false, reason: "hidden" };
    }
  }

  const firstSegment = segments[0];
  if (firstSegment && PROTECTED_ROOT_SEGMENTS.has(firstSegment)) {
    return { ok: false, reason: "protected" };
  }

  return { ok: true };
}

export function isValidOutputPath(filePath: string): boolean {
  return checkOutputPath(filePath).ok;
}
