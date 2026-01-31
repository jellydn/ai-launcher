/**
 * Prompt generation for AI analysis
 */

/**
 * Build analysis prompt for AI based on git diff
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
