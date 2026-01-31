# Usage

## 🎯 Interactive Mode

Run without arguments to open fuzzy search:

```bash
ai
```

**Controls:**

| Key | Action |
|-----|--------|
| Type | Filter tools and templates |
| `↑` / `Ctrl+P` / `Shift+Tab` | Move up |
| `↓` / `Ctrl+N` / `Tab` | Move down |
| `Enter` | Select and launch |
| `Esc` / `Ctrl+C` | Cancel |

> **Note:** Tab/Shift+Tab navigate the list (not shell completion) since the UI runs in raw mode.

- Templates show `[T]` indicator
- Compact mode for narrow terminals (< 60 chars)
- Real-time fuzzy matching on names, descriptions, and aliases

## ⚡ Direct Invocation

Launch a tool directly by name or alias:

```bash
ai claude        # Launch Claude
ai amp           # Launch Amp
ai ccs:glm       # Launch CCS with glm profile
ai c             # Uses alias for claude (if configured)
```

**Fuzzy matching** works when no exact match is found:

```bash
ai cl            # Matches "claude"
ai op            # Matches "opencode"
ai cc            # Matches "ccs" or "claude" (will ask if ambiguous)
```

**CCS Profile Detection**: Automatically detects CCS profiles and creates tools like:

- `ccs:glm` - GPT model profile
- `ccs:kimi` - Kimi model profile
- `ccs:custom` - Custom profile name

## Passing Arguments

Pass arguments to the selected tool:

```bash
ai claude --help              # Direct: passes --help to claude
ai -- --help                  # Fuzzy: select tool, then pass --help
ai claude -- --version        # Explicit separator
```

## Templates with Arguments & Stdin

Templates can use `$@` as a placeholder for arguments or piped stdin:

```bash
# Pass arguments directly
ai summarize main.ts          # Expands template with arguments

# Pipe content via stdin
cat main.ts | ai summarize    # Pipe file content to template
git diff | ai review          # Pipe git diff for code review
echo "Hello world" | ai summarize
```

Both methods substitute content into the `$@` placeholder. If no input is provided for a template requiring `$@`, an error is shown.

## Templates Without Arguments

Templates without `$@` run immediately when selected - perfect for common commands with embedded prompts:

```bash
# In config.json - no prompt needed, runs directly
ai gemini-arch                # Runs immediately: ccs gemini 'Explain...'
ai                           # Or select from interactive menu
```

These templates have fixed commands and execute instantly on selection.

## Git Diff Analysis

Analyze your git changes with AI assistants for code review, risk assessment, and improvement suggestions:

```bash
# Analyze staged changes
ai claude --diff-staged           # Analyze staged changes with Claude
ai --diff-staged                  # Select tool, then analyze staged changes

# Analyze commit diffs
ai claude --diff-commit HEAD~1    # Compare current state with previous commit
ai --diff-commit main             # Compare current branch with main
ai amp --diff-commit origin/main  # Compare with remote branch
ai --diff-commit HEAD~3           # Analyze last 3 commits

# Custom prompt - add specific instructions
ai --diff-staged --diff-prompt "Focus on security vulnerabilities"
ai --diff-commit HEAD~1 --diff-prompt "Check for breaking changes"

# Save output to markdown file
ai --diff-staged --diff-output analysis.md
ai --diff-commit main --diff-output review.md

# Combine all options
ai claude --diff-commit HEAD~1 --diff-prompt "Review performance" --diff-output report.md

# Combine with tool selection
ai c --diff-staged                # Use alias
ai --diff-commit HEAD~1           # Interactive tool selection
```

**What the AI analyzes:**

1. **Summary**: Overview of what changed
2. **Potential Risks**: Security issues, breaking changes, edge cases
3. **Best Practices**: Code quality, patterns, conventions
4. **Improvements**: Suggestions for better implementation

**Use Cases:**

```bash
# Pre-commit review with custom focus
git add -A && ai claude --diff-staged --diff-prompt "Check for SQL injection risks"

# Save analysis for documentation
ai --diff-commit origin/main --diff-output deployment-review.md

# Review before push with specific concerns
ai --diff-commit origin/main --diff-prompt "Verify backward compatibility"

# Quick sanity check and save
git add . && ai c --diff-staged --diff-output quick-review.md
```

The feature automatically constructs a prompt with the diff and sends it to your chosen AI assistant for analysis. Use `--diff-prompt` to add custom instructions and `--diff-output` to save the analysis to a markdown file.
