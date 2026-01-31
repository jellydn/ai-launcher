/**
 * Prompt generation for AI analysis
 */

export function buildDiffAnalysisPrompt(
  diff: string,
  ref?: string,
  customPrompt?: string
): string {
  const target = ref || "staged changes";
  const basePrompt = `Please analyze the following git diff (${target}):

${diff}

Provide:
1. A summary of the changes
2. Potential risks or issues
3. Whether the changes align with best practices
4. Any suggestions for improvement`;

  if (customPrompt) {
    return `${basePrompt}

Additional instructions:
${customPrompt}`;
  }

  return basePrompt;
}
