import {
  GitCommandError,
  GitDiffError,
  InvalidGitRefError,
  NoChangesError,
  NotGitRepositoryError,
} from "../errors";
import type { SelectionResult } from "../fuzzy-select";
import { ensureGitRepository, getGitDiff } from "../git-diff";
import type { LookupItem } from "../lookup";
import { findToolByName } from "../lookup";
import { buildDiffAnalysisPrompt } from "../prompts";
import type { SelectableItem } from "../types";

export interface DiffCommandOptions {
  type: "staged" | "commit";
  ref?: string;
  customPrompt?: string;
  outputFile?: string;
}

export interface DiffCommandContext {
  args: string[];
  lookupItems: LookupItem[];
  fuzzySelect: (items: SelectableItem[]) => Promise<SelectionResult>;
  items: SelectableItem[];
  outputFile?: string;
}

/**
 * Validate git reference format to prevent injection
 * Allows: alphanumeric, -, _, /, ., ~, ^, @, {, } and common ref patterns
 */
function isValidGitRef(ref: string): boolean {
  // Git ref pattern: allows HEAD, branch names, tags, commit SHAs, and ref operators including {}
  const validRefPattern = /^[a-zA-Z0-9._\-/~^@{}]+$/;

  // Additional safety: reject refs that could be dangerous
  const dangerousPatterns = [
    /^-/, // Starts with dash (could be interpreted as flag)
    /[;&|`$()<>[\]]/, // Shell metacharacters (excluding {} which git uses)
    /\.\./g, // Multiple consecutive dots can be confusing
  ];

  if (!validRefPattern.test(ref)) {
    return false;
  }

  for (const pattern of dangerousPatterns) {
    if (pattern.test(ref)) {
      return false;
    }
  }

  return true;
}

/**
 * Parse diff command arguments
 */
export function parseDiffArgs(args: string[]): {
  hasDiffCommand: boolean;
  options?: DiffCommandOptions;
  diffFlagIndex?: number;
} {
  const diffStagedIndex = args.indexOf("--diff-staged");
  const diffCommitIndex = args.indexOf("--diff-commit");

  if (diffStagedIndex === -1 && diffCommitIndex === -1) {
    return { hasDiffCommand: false };
  }

  // Parse optional flags
  const diffPromptIndex = args.indexOf("--diff-prompt");
  const customPrompt = diffPromptIndex !== -1 ? args[diffPromptIndex + 1] : undefined;

  const diffOutputIndex = args.indexOf("--diff-output");
  const outputFile = diffOutputIndex !== -1 ? args[diffOutputIndex + 1] : undefined;

  // Validate --diff-prompt has a value
  if (diffPromptIndex !== -1 && (!customPrompt || customPrompt.startsWith("-"))) {
    throw new GitDiffError("--diff-prompt requires a prompt text");
  }

  // Validate --diff-output has a value
  if (diffOutputIndex !== -1 && (!outputFile || outputFile.startsWith("-"))) {
    throw new GitDiffError("--diff-output requires a file path");
  }

  // Prioritize --diff-staged if both are present
  if (diffStagedIndex !== -1) {
    return {
      hasDiffCommand: true,
      options: { type: "staged", customPrompt, outputFile },
      diffFlagIndex: diffStagedIndex,
    };
  }

  // Handle --diff-commit with ref
  const ref = args[diffCommitIndex + 1];
  if (!ref || ref.startsWith("-")) {
    throw new GitDiffError("--diff-commit requires a git reference (e.g., HEAD~1, main)");
  }

  // Validate ref format
  if (!isValidGitRef(ref)) {
    throw new GitDiffError(
      `Invalid git reference format: ${ref}. Only alphanumeric characters, -, _, /, ., ~, ^, and @ are allowed.`
    );
  }

  return {
    hasDiffCommand: true,
    options: { type: "commit", ref, customPrompt, outputFile },
    diffFlagIndex: diffCommitIndex,
  };
}

/**
 * Execute diff analysis command
 */
export async function executeDiffCommand(
  options: DiffCommandOptions,
  diffFlagIndex: number,
  context: DiffCommandContext,
  launchToolWithPrompt: (
    command: string,
    prompt: string,
    useStdin?: boolean,
    outputFile?: string
  ) => never
): Promise<never> {
  try {
    ensureGitRepository();
  } catch (error) {
    if (error instanceof NotGitRepositoryError) {
      console.error("Not a git repository");
      console.error("Initialize a git repository with: git init");
      process.exit(1);
    }
    throw error;
  }

  let diff: string;
  try {
    diff = getGitDiff(options);
  } catch (error) {
    if (error instanceof NoChangesError) {
      if (options.type === "staged") {
        console.error("No staged changes found");
        console.error("Stage changes with: git add <files>");
      } else {
        console.error("No changes found in diff");
        console.error(`Check your git reference: ${options.ref}`);
      }
      process.exit(1);
    }
    if (error instanceof InvalidGitRefError) {
      console.error(error.message);
      console.error("Use valid git references like: HEAD~1, main, origin/main, or commit SHA");
      process.exit(1);
    }
    if (error instanceof GitCommandError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const analysisPrompt = buildDiffAnalysisPrompt(diff, options.ref, options.customPrompt);

  // If output file is specified, inform the user
  if (options.outputFile) {
    console.log(`\n📝 Output will be saved to: ${options.outputFile}\n`);
  }

  // Determine which tool to use (args before the diff flag)
  const argsBeforeFlag = context.args.slice(0, diffFlagIndex);

  if (argsBeforeFlag.length === 0) {
    const result = await context.fuzzySelect(context.items);
    if (result.cancelled) {
      process.exit(0);
    }
    if (!result.item) {
      console.error("No tool selected");
      process.exit(1);
    }
    console.log(`\nAnalyzing git diff with ${result.item.name}...\n`);
    const toolCommand = result.item.promptCommand ?? result.item.command;
    const useStdin = result.item.promptUseStdin ?? false;
    return launchToolWithPrompt(toolCommand, analysisPrompt, useStdin, options.outputFile);
  }

  const toolQuery = argsBeforeFlag[0];
  const lookupResult = findToolByName(toolQuery, context.lookupItems);
  if (!lookupResult.success || !lookupResult.item) {
    console.error(lookupResult.error);
    process.exit(1);
  }
  console.log(`\nAnalyzing git diff with ${lookupResult.item.name}...\n`);
  const toolCommand = lookupResult.item.promptCommand ?? lookupResult.item.command;
  const useStdin = lookupResult.item.promptUseStdin ?? false;

  return launchToolWithPrompt(toolCommand, analysisPrompt, useStdin, options.outputFile);
}
