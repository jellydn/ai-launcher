# Templates

Templates are reusable command shortcuts that can accept arguments or stdin via the `$@` placeholder.

## Basic Template Structure

```json
{
  "name": "template-name",
  "command": "ai-tool -p 'Your prompt: $@'",
  "description": "What this template does",
  "aliases": ["shortcut"]
}
```

## Templates with Arguments

Templates can accept arguments via `$@`:

```bash
# Configuration
{
  "name": "summarize",
  "command": "claude -p 'Summarize this file: $@'",
  "description": "Summarize a file with Claude"
}

# Usage
ai summarize main.ts
# Expands to: claude -p 'Summarize this file: main.ts'
```

## Templates with Stdin

Templates can accept piped content:

```bash
# Configuration
{
  "name": "review",
  "command": "amp -p 'Review this code: $@'",
  "description": "Code review with Amp"
}

# Usage
git diff | ai review
cat file.ts | ai review
```

## Templates Without Arguments

Templates without `$@` run immediately:

```bash
# Configuration
{
  "name": "gemini-arch",
  "command": "ccs gemini 'Explain this codebase architecture'",
  "description": "Explain architecture with Gemini",
  "aliases": ["arch"]
}

# Usage
ai arch
# Runs immediately: ccs gemini 'Explain this codebase architecture'
```

## Template Categories

### Code Quality & TypeScript

```json
{
  "templates": [
    {
      "name": "types",
      "command": "claude -p 'Improve TypeScript types: Remove any, add proper type guards, ensure strict mode compliance for: $@'",
      "description": "Enhance type safety",
      "aliases": ["typescript"]
    },
    {
      "name": "test",
      "command": "claude -p 'Write Bun tests using Arrange-Act-Assert pattern. Focus on behavior, not implementation details for: $@'",
      "description": "Generate tests",
      "aliases": ["spec", "tests"]
    },
    {
      "name": "docs",
      "command": "claude -p 'Add JSDoc comments with @param and @returns. Include usage examples for: $@'",
      "description": "Add documentation",
      "aliases": ["document"]
    },
    {
      "name": "explain",
      "command": "claude -p 'Explain this code in detail: 1) What it does 2) How it works 3) Design decisions: $@'",
      "description": "Code explanation",
      "aliases": ["wtf", "explain-code"]
    }
  ]
}
```

### Specialized Reviews

```json
{
  "templates": [
    {
      "name": "review-security",
      "command": "claude -p 'Security review: Check for injection vulnerabilities, input validation, auth issues, and sensitive data handling in: $@'",
      "description": "Security-focused review",
      "aliases": ["sec", "security"]
    },
    {
      "name": "review-refactor",
      "command": "claude -p 'Refactor suggestion: Improve readability, eliminate complexity, and apply clean code principles to: $@'",
      "description": "Refactoring recommendations",
      "aliases": ["refactor"]
    },
    {
      "name": "review-performance",
      "command": "claude -p 'Analyze performance: Identify bottlenecks, suggest optimizations with measurable impact for: $@'",
      "description": "Performance review",
      "aliases": ["perf", "optimize"]
    }
  ]
}
```

### Git Workflow

```json
{
  "templates": [
    {
      "name": "commit-zen",
      "command": "opencode run 'Generate commit message: $@'",
      "description": "Generate commit message",
      "aliases": ["commit"]
    },
    {
      "name": "pr-title",
      "command": "claude -p 'Write a clear PR title (max 72 chars) using Conventional Commits: Type(scope): description'",
      "description": "Generate PR title"
    },
    {
      "name": "release-notes",
      "command": "git diff HEAD~1 | opencode run 'Generate user-friendly release notes from this diff'",
      "description": "Generate release notes"
    }
  ]
}
```

### Code Cleanup

```json
{
  "templates": [
    {
      "name": "remove-ai-slop",
      "command": "claude -p \"Remove: 1) Excessive comments 2) Defensive checks 3) Type escape hatches 4) Generic patterns. Match existing conventions: $@\"",
      "description": "Remove AI-generated patterns",
      "aliases": ["slop", "clean-ai"]
    },
    {
      "name": "tidy-first",
      "command": "claude -p 'Apply Tidy First principles: 1) Use guard clauses 2) Extract helper variables 3) Remove dead code 4) Normalize symmetries: $@'",
      "description": "Tidy code",
      "aliases": ["tidy"]
    },
    {
      "name": "simplify",
      "command": "claude -p \"Simplify: Remove unnecessary complexity, eliminate over-engineering, reduce coupling: $@\"",
      "description": "Simplify code",
      "aliases": ["simple"]
    }
  ]
}
```

## Usage Examples

```bash
# Code quality
cat src/lookup.ts | ai explain         # Explain a file
ai test src/config.test.ts             # Generate tests
ai types src/lookup.ts                 # Improve types

# Reviews
git diff | ai review-security          # Security review
cat main.ts | ai review-performance    # Performance analysis

# Git workflow
git diff --staged | ai commit-zen      # Generate commit
ai pr-title                           # Generate PR title

# Code cleanup
cat src/file.ts | ai remove-ai-slop    # Clean up AI patterns
git diff | ai tidy-first               # Apply Tidy First
cat src/complex.ts | ai simplify       # Simplify code
```

## Best Practices

1. **Use descriptive names**: Make template names clear and searchable
2. **Add aliases**: Short aliases for frequently used templates
3. **Group by category**: Use prefixes like `review-`, `commit-`, `test-`
4. **Choose the right AI**: Match the tool to the task (Claude for TypeScript, etc.)
5. **Test your templates**: Ensure they work as expected before adding to config

## Complete Example

See the [main README](https://github.com/jellydn/ai-cli-switcher/blob/main/README.md#-template-examples--tips) for a complete real-world example configuration.
