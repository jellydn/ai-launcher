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
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
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
