/**
 * Git diff analysis command handler
 */

import { GitDiffError, NotGitRepositoryError } from "../errors";
import type { SelectionResult } from "../fuzzy-select";
import { ensureGitRepository, getGitDiff } from "../git-diff";
import type { LookupItem } from "../lookup";
import { findToolByName } from "../lookup";
import { buildDiffAnalysisPrompt } from "../prompts";
import type { SelectableItem } from "../types";

export interface DiffCommandOptions {
  type: "staged" | "commit";
  ref?: string;
}

export interface DiffCommandContext {
  args: string[];
  lookupItems: LookupItem[];
  fuzzySelect: (items: SelectableItem[]) => Promise<SelectionResult>;
  items: SelectableItem[];
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

  // Prioritize --diff-staged if both are present
  if (diffStagedIndex !== -1) {
    return {
      hasDiffCommand: true,
      options: { type: "staged" },
      diffFlagIndex: diffStagedIndex,
    };
  }

  // Handle --diff-commit with ref
  const ref = args[diffCommitIndex + 1];
  if (!ref || ref.startsWith("-")) {
    throw new GitDiffError("--diff-commit requires a git reference (e.g., HEAD~1, main)");
  }

  return {
    hasDiffCommand: true,
    options: { type: "commit", ref },
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
  launchToolWithPrompt: (command: string, prompt: string) => never
): Promise<never> {
  // Ensure we're in a git repository
  try {
    ensureGitRepository();
  } catch (error) {
    if (error instanceof NotGitRepositoryError) {
      console.error("❌ Not a git repository");
      process.exit(1);
    }
    throw error;
  }

  // Get the git diff
  let diff: string;
  try {
    diff = getGitDiff(options);
  } catch (error) {
    if (error instanceof GitDiffError) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  // Build analysis prompt
  const analysisPrompt = buildDiffAnalysisPrompt(diff, options.ref);

  // Determine which tool to use (args before the diff flag)
  const argsBeforeFlag = context.args.slice(0, diffFlagIndex);

  if (argsBeforeFlag.length === 0) {
    // No tool specified, use fuzzy select
    const result = await context.fuzzySelect(context.items);
    if (result.cancelled) {
      process.exit(0);
    }
    if (!result.item) {
      console.error("No tool selected");
      process.exit(1);
    }
    const toolCommand = result.item.command;
    return launchToolWithPrompt(toolCommand, analysisPrompt);
  }

  // Tool specified before flag
  const toolQuery = argsBeforeFlag[0];
  const lookupResult = findToolByName(toolQuery, context.lookupItems);
  if (!lookupResult.success || !lookupResult.item) {
    console.error(lookupResult.error);
    process.exit(1);
  }
  const toolCommand = lookupResult.item.command;

  // Launch tool with analysis prompt
  console.log("\nAnalyzing git diff...\n");
  return launchToolWithPrompt(toolCommand, analysisPrompt);
}
