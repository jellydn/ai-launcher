/**
 * Custom error classes for git diff operations
 */

export class GitDiffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitDiffError";
  }
}

export class NotGitRepositoryError extends GitDiffError {
  constructor() {
    super("Not a git repository");
    this.name = "NotGitRepositoryError";
  }
}

export class InvalidGitRefError extends GitDiffError {
  constructor(ref: string) {
    super(`Invalid git reference: ${ref}`);
    this.name = "InvalidGitRefError";
  }
}

export class NoChangesError extends GitDiffError {
  constructor() {
    super("No changes found in diff");
    this.name = "NoChangesError";
  }
}

export class GitCommandError extends GitDiffError {
  constructor(message: string) {
    super(`Git command failed: ${message}`);
    this.name = "GitCommandError";
  }
}
