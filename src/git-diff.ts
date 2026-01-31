import { spawnSync } from "node:child_process";
import {
  GitCommandError,
  InvalidGitRefError,
  NoChangesError,
  NotGitRepositoryError,
} from "./errors";

export interface GitDiffOptions {
  type: "staged" | "commit";
  ref?: string;
}

// 10MB buffer limit - sufficient for most diffs, prevents memory issues
const MAX_DIFF_BUFFER_SIZE = 10 * 1024 * 1024;
// Warn if diff exceeds 8MB (80% of buffer)
const DIFF_SIZE_WARNING_THRESHOLD = 8 * 1024 * 1024;

/**
 * Get git diff based on options
 * @throws {InvalidGitRefError} When git diff options are invalid
 * @throws {GitCommandError} When git command fails
 * @throws {NoChangesError} When no changes are found
 */
export function getGitDiff(options: GitDiffOptions): string {
  let args: string[];

  if (options.type === "staged") {
    args = ["diff", "--cached"];
  } else if (options.ref) {
    args = ["diff", options.ref];
  } else {
    throw new InvalidGitRefError("Missing required ref for commit diff");
  }

  const result = spawnSync("git", args, {
    encoding: "utf-8",
    maxBuffer: MAX_DIFF_BUFFER_SIZE,
  });

  if (result.error) {
    // Check if error is due to buffer overflow
    if (result.error.message.includes("maxBuffer") || result.error.message.includes("ENOBUFS")) {
      throw new GitCommandError(
        `Diff too large (exceeds ${MAX_DIFF_BUFFER_SIZE / 1024 / 1024}MB limit). Consider analyzing specific files or commits separately.`
      );
    }
    throw new GitCommandError(result.error.message);
  }

  if (result.status !== 0) {
    throw new GitCommandError(
      `Git exited with code ${result.status}: ${result.stderr || "Unknown error"}`
    );
  }

  const diff = result.stdout.trim();
  if (!diff) {
    throw new NoChangesError();
  }

  // Warn if diff is approaching buffer limit
  const diffSize = Buffer.byteLength(diff, "utf-8");
  if (diffSize > DIFF_SIZE_WARNING_THRESHOLD) {
    console.warn(
      `⚠️  Warning: Large diff (${(diffSize / 1024 / 1024).toFixed(1)}MB). Consider analyzing specific files if truncation occurs.`
    );
  }

  return diff;
}

/**
 * Check if current directory is a git repository
 * @throws {NotGitRepositoryError} When not in a git repository
 */
export function ensureGitRepository(): void {
  if (!isGitRepository()) {
    throw new NotGitRepositoryError();
  }
}

/**
 * Check if current directory is a git repository (non-throwing version)
 */
export function isGitRepository(): boolean {
  const result = spawnSync("git", ["rev-parse", "--git-dir"], {
    encoding: "utf-8",
  });
  return result.status === 0;
}
