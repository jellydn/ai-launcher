<p align="center">
  <img src="logo.svg" alt="AI CLI Switcher Logo" width="400">
</p>

# AI CLI Switcher

> A fast, secure launcher CLI tool that lets you switch between different AI coding assistants using fuzzy search. Built with TypeScript and Bun for optimal performance.

## ✨ Features

- **🔍 Fuzzy Search**: Interactive terminal UI with real-time filtering and keyboard navigation
- **🔧 Auto-Detection**: Automatically finds installed AI CLIs (claude, opencode, amp, ccs)
- **⚡ Direct Invocation**: Skip the menu with `ai <toolname>` or fuzzy matching
- **🏷️ Aliases**: Define short aliases for frequently used tools (e.g., `ai c` for claude)
- **📋 Templates**: Create command shortcuts with `$@` argument/stdin placeholders
- **👤 CCS Profiles**: Automatically detects CCS profiles via `ccs api list`
- **📊 Git Diff Analysis**: Analyze staged or commit diffs with AI assistants
- **🔒 Security**: Built-in command validation and injection prevention
- **🌍 Cross-Platform**: Works on macOS, Linux, and Windows
- **⚙️ Configuration**: User-defined tools override auto-detection

## Installation

### One-line Install (macOS/Linux)

```sh
curl -fsSL https://raw.githubusercontent.com/jellydn/ai-cli-switcher/main/install.sh | sh
```

<details>
<summary>Safer alternative (inspect before running)</summary>

```sh
curl -fsSL -o install.sh https://raw.githubusercontent.com/jellydn/ai-cli-switcher/main/install.sh
less install.sh  # inspect the script
sh install.sh
```

</details>

### Homebrew (macOS/Linux)

```sh
brew install jellydn/tap/ai
```

### Windows

Download the latest `ai-windows-x64.exe` from [Releases](https://github.com/jellydn/ai-cli-switcher/releases) and add to your PATH.

### Build from Source

Requires [Bun](https://bun.sh):

```bash
git clone https://github.com/jellydn/ai-cli-switcher
cd ai-cli-switcher
bun install
bun run build
```

This produces a standalone executable at `dist/ai`.

### Manual Install

```bash
# Option 1: Symlink to /usr/local/bin (requires sudo)
sudo ln -sf "$(pwd)/dist/ai" /usr/local/bin/ai

# Option 2: Symlink to ~/.local/bin (no sudo required)
mkdir -p ~/.local/bin
ln -sf "$(pwd)/dist/ai" ~/.local/bin/ai
# Ensure ~/.local/bin is in your PATH
```

Verify installation:

```bash
ai --help
```

[![ai --help](https://i.gyazo.com/271b43515723f8f95a492882fb5cf4c4.png)](https://gyazo.com/271b43515723f8f95a492882fb5cf4c4)

## Usage

### 🎯 Interactive Mode

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

### ⚡ Direct Invocation

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

### Passing Arguments

Pass arguments to the selected tool:

```bash
ai claude --help              # Direct: passes --help to claude
ai -- --help                  # Fuzzy: select tool, then pass --help
ai claude -- --version        # Explicit separator
```

### Templates with Arguments & Stdin

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

### Templates Without Arguments

Templates without `$@` run immediately when selected - perfect for common commands with embedded prompts:

```bash
# In config.json - no prompt needed, runs directly
ai gemini-arch                # Runs immediately: ccs gemini 'Explain...'
ai                           # Or select from interactive menu
```

These templates have fixed commands and execute instantly on selection.

### Git Diff Analysis

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

## Configuration

Config file location: `~/.config/ai-switcher/config.json`

A default config is created on first run. Example:

```json
{
  "tools": [
    {
      "name": "claude",
      "command": "claude",
      "description": "Anthropic Claude CLI",
      "aliases": ["c"],
      "promptCommand": "claude --permission-mode plan -p"
    },
    {
      "name": "opencode",
      "command": "opencode",
      "description": "OpenCode AI assistant",
      "aliases": ["o", "oc"],
      "promptCommand": "opencode run",
      "promptUseStdin": true
    },
    {
      "name": "amp",
      "command": "amp",
      "description": "Sourcegraph Amp CLI",
      "aliases": ["a"],
      "promptCommand": "amp -x",
      "promptUseStdin": true
    }
  ],
  "templates": [
    {
      "name": "summarize",
      "command": "claude -p 'Summarize this file: $@'",
      "description": "Summarize a file with Claude"
    },
    {
      "name": "review",
      "command": "amp -p 'Review this code: $@'",
      "description": "Code review with Amp"
    }
  ]
}
```

For more detailed configuration options and examples, see the [Configuration Guide](configuration.md).

## Quick Links

- [Installation Guide](installation.md)
- [Usage Guide](usage.md)
- [Configuration Guide](configuration.md)
- [Template Examples](templates.md)
- [Development Guide](development.md)
- [Contributing](contributing.md)
