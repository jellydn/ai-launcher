import { spawnSync } from "node:child_process";

export interface GitDiffOptions {
  type: "staged" | "commit";
  ref?: string;
}

export interface GitDiffResult {
  success: boolean;
  diff: string;
  error?: string;
}

/**
 * Get git diff based on options
 */
export function getGitDiff(options: GitDiffOptions): GitDiffResult {
  let args: string[];

  if (options.type === "staged") {
    args = ["diff", "--cached"];
  } else if (options.type === "commit" && options.ref) {
    args = ["diff", options.ref];
  } else {
    return {
      success: false,
      diff: "",
      error: "Invalid git diff options",
    };
  }

  const result = spawnSync("git", args, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024, // 10MB
  });

  if (result.error) {
    return {
      success: false,
      diff: "",
      error: `Git command failed: ${result.error.message}`,
    };
  }

  if (result.status !== 0) {
    return {
      success: false,
      diff: "",
      error: `Git command exited with code ${result.status}: ${result.stderr || "Unknown error"}`,
    };
  }

  const diff = result.stdout.trim();
  if (!diff) {
    return {
      success: false,
      diff: "",
      error: "No changes found in diff",
    };
  }

  return {
    success: true,
    diff,
  };
}

/**
 * Check if current directory is a git repository
 */
export function isGitRepository(): boolean {
  const result = spawnSync("git", ["rev-parse", "--git-dir"], {
    encoding: "utf-8",
  });
  return result.status === 0;
}

/**
 * Build analysis prompt for AI based on diff
 */
export function buildDiffAnalysisPrompt(diff: string, ref?: string): string {
  const target = ref || "staged changes";
  return `Please analyze the following git diff (${target}):

${diff}

Provide:
1. A summary of the changes
2. Potential risks or issues
3. Whether the changes align with best practices
4. Any suggestions for improvement`;
}
