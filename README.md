<p align="center">
  <img src="docs/logo.svg" alt="AI CLI Switcher Logo" width="400">
</p>

<h1 align="center">AI CLI Switcher</h1>
 
<p align="center">
  A fast, secure launcher CLI tool that lets you switch between different AI coding assistants using fuzzy search. Built with TypeScript and Bun for optimal performance.
</p>

<p align="center">
  <a href="#installation"><strong>Installation</strong></a> •
  <a href="#usage"><strong>Usage</strong></a> •
  <a href="#configuration"><strong>Configuration</strong></a>
</p>

---

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
# Pre-commit review
git add -A && ai claude --diff-staged

# Review before push
ai --diff-commit origin/main

# Understand recent changes
ai --diff-commit HEAD~5

# Quick sanity check
git add . && ai c --diff-staged
```

The feature automatically constructs a prompt with the diff and sends it to your chosen AI assistant for analysis.

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
    },
    {
      "name": "commit-zen",
      "command": "opencode run 'Generate commit message: $@'",
      "description": "Generate commit message with OpenCode"
    },
    {
      "name": "gemini-arch",
      "command": "ccs gemini 'Explain this codebase architecture'",
      "description": "Explain architecture with Gemini",
      "aliases": ["arch"]
    }
  ]
}
```

### Config Options

**tools**: Array of AI tools

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name and primary lookup key |
| `command` | ✅ | The CLI command to execute |
| `description` | ❌ | Shown in fuzzy search list |
| `aliases` | ❌ | Array of short aliases (e.g., `["c", "cl"]`) |
| `promptCommand` | ❌ | Alternative command for `--diff-*` prompts |
| `promptUseStdin` | ❌ | If `true`, pipe prompt via stdin instead of argument |

**templates**: Array of command templates

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Template name (shown with [T] indicator) |
| `command` | ✅ | Command string, use `$@` for argument substitution |
| `description` | ✅ | Template description |
| `aliases` | ❌ | Array of short aliases |

### Git Diff Prompt Configuration

Different AI CLIs accept prompts in different ways. The `promptCommand` and `promptUseStdin` fields configure how `--diff-staged` and `--diff-commit` send prompts:

| Tool | Prompt Command | Why |
|------|----------------|-----|
| `claude` | `claude --permission-mode plan -p 'prompt'` | Uses plan mode for read-only analysis |
| `ccs` | `ccs <profile> --permission-mode plan -p 'prompt'` | Uses plan mode for read-only analysis |
| `opencode` | `echo 'prompt' &#124; opencode run` | First arg is treated as project path, needs stdin |
| `amp` | `echo 'prompt' &#124; amp -x` | Execute mode works best with stdin |

**Example configuration:**

```json
{
  "name": "opencode",
  "command": "opencode",
  "promptCommand": "opencode run",
  "promptUseStdin": true
}
```

This tells ai-switcher: when running `ai opencode --diff-staged`, pipe the diff prompt to `opencode run` via stdin instead of passing it as an argument.

### 🔍 Auto-Detection

The following CLIs are auto-detected if installed and available in PATH:

- `claude` - Anthropic Claude CLI
- `opencode` - OpenCode AI assistant
- `amp` - Sourcegraph Amp CLI
- `ccs` - **Claude Code Switch** (with profile detection via `ccs api list`)

**Precedence Rules:**

1. User-defined tools in config.json (highest priority)
2. Auto-detected tools (fallback)
3. Tools with same name or command are de-duplicated

**CCS Profile Auto-Detection:**
Runs `ccs api list` to detect active profiles. Each profile with `[OK]` status becomes available as `ccs:<profile-name>`.

## 💡 Template Examples & Tips

> Based on a real-world config using **claude**, **opencode**, **amp**, and **CCS** profiles.

### Your Current Templates

These are the templates from your active config:

```json
{
  "templates": [
    {
      "name": "review",
      "command": "opencode run --model opencode/big-pickle --agent plan 'Review the following changes and provide feedback: $@'",
      "description": "Code review with OpenCode",
      "aliases": ["rev", "code-review"]
    },
    {
      "name": "commit-zen",
      "command": "opencode run --model opencode/big-pickle --agent plan 'Review the following changes and generate a concise git commit message: $@'",
      "description": "Generate commit message with OpenCode",
      "aliases": ["commit", "commit-message"]
    },
    {
      "name": "commit-atomic",
      "command": "opencode run --model opencode/big-pickle --agent build 'Run git diff --staged then do atomic commit message for the change with commitizen convention. Write clear, informative commit messages that explain the what and why behind changes, not just the how.'",
      "description": "Atomic commit message with OpenCode",
      "aliases": ["ac", "auto-commit"]
    },
    {
      "name": "architecture-explanation",
      "command": "ccs gemini 'Explain this codebase architecture'",
      "description": "Explain architecture with Gemini",
      "aliases": ["arch", "arch-explanation"]
    },
    {
      "name": "draft-pull-request",
      "command": "ccs glm 'Create draft pr with what why how by gh cli'",
      "description": "Create draft pull request with GLM",
      "aliases": ["pr", "draft-pr"]
    }
  ]
}
```

### Complementary Templates to Add

Expand your toolkit with these templates that work with your existing tools:

#### Code Quality & TypeScript

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

#### Specialized Reviews

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

#### Git Workflow Enhancements

```json
{
  "templates": [
    {
      "name": "pr-title",
      "command": "claude -p 'Write a clear PR title (max 72 chars) using Conventional Commits: Type(scope): description'",
      "description": "Generate PR title only"
    },
    {
      "name": "release-notes",
      "command": "git diff HEAD~1 | opencode run --model opencode/big-pickle --agent plan 'Generate user-friendly release notes from this diff, focusing on user-facing changes'",
      "description": "Generate release notes from last commit"
    }
  ]
}
```

#### Design & Architecture

```json
{
  "templates": [
    {
      "name": "design-review",
      "command": "claude -p 'Review this design for: maintainability, extensibility, and separation of concerns: $@'",
      "description": "Design pattern review",
      "aliases": ["design"]
    },
    {
      "name": "api-design",
      "command": "claude -p 'Review this API design for: REST principles, error handling, versioning, and documentation: $@'",
      "description": "API design review"
    },
    {
      "name": "profiler-guidance",
      "command": "claude -p 'Suggest profiling strategy: What to measure, tools to use, and how to interpret results for: $@'",
      "description": "Profiling guidance"
    }
  ]
}
```

#### Quick-Fix Templates (No Arguments)

```json
{
  "templates": [
    {
      "name": "fix-lint",
      "command": "opencode run 'Fix all linting errors in current file'",
      "description": "Auto-fix lint issues"
    },
    {
      "name": "format-imports",
      "command": "claude -p 'Organize and sort imports, remove unused imports, add type imports where needed'",
      "description": "Clean up imports",
      "aliases": ["imports"]
    },
    {
      "name": "add-error-handling",
      "command": "claude -p 'Add proper error handling with try-catch and meaningful error messages'",
      "description": "Add error handling"
    }
  ]
}
```

#### Code Cleanup & Refactoring

```json
{
  "templates": [
    {
      "name": "remove-ai-slop",
      "command": "claude -p \"You're reviewing code cleanup. Remove: 1) Excessive comments that break existing documentation style 2) Defensive checks that don't match the codebase's trust model 3) Type escape hatches (any casts, assertions) 4) Generic patterns that feel imported rather than native. Match the file's existing voice and conventions. Report what you removed in 1-3 sentences: $@\"",
      "description": "Remove AI-generated code patterns",
      "aliases": ["slop", "clean-ai"]
    },
    {
      "name": "tidy-first",
      "command": "claude -p 'Apply Tidy First principles: 1) Use guard clauses 2) Extract helper variables for complex expressions 3) Remove dead code 4) Normalize symmetries. Focus on making the code easier to understand: $@'",
      "description": "Tidy code before making changes",
      "aliases": ["tidy"]
    },
    {
      "name": "simplify",
      "command": "claude -p \"Simplify this code: Remove unnecessary complexity, eliminate over-engineering, reduce coupling. Keep solutions simple and focused on what's actually needed: $@\"",
      "description": "Simplify over-engineered code",
      "aliases": ["simple"]
    }
  ]
}
```

### Usage Examples

```bash
# Your current templates
git diff | ai review                    # Review with OpenCode big-pickle
git diff --staged | ai commit-zen       # Generate commit message
ai ac                                  # Atomic commit (runs git diff internally)
ai arch                                # Explain architecture with Gemini
ai pr                                  # Create draft PR with GLM

# Additional templates to add
cat src/lookup.ts | ai explain         # Explain a file
ai test src/config.test.ts             # Generate tests
ai types src/lookup.ts                 # Improve types
git diff HEAD~1 | ai release-notes     # Generate release notes

# Security & performance reviews
git diff | ai review-security          # Security-focused review
cat main.ts | ai review-performance    # Performance analysis

# Quick fixes (no arguments needed)
ai format-imports                      # Clean up imports immediately
ai fix-lint                            # Auto-fix linting errors

# Code cleanup & refactoring
cat src/file.ts | ai remove-ai-slop    # Clean up AI-generated patterns
git diff | ai tidy-first               # Apply Tidy First principles
cat src/complex.ts | ai simplify       # Simplify over-engineered code
```

### Pro Tips

1. **Your current aliases**: Use short aliases you've configured
   - `ai rev` → `review` (OpenCode code review)
   - `ai ac` → `commit-atomic` (atomic commits)
   - `ai arch` → `architecture-explanation` (Gemini architecture)

2. **Model selection**: Choose the right AI for the task
   - **OpenCode big-pickle**: Great for code review and commits (your current choice)
   - **Claude**: Best for TypeScript, testing, and explanations
   - **CCS Gemini**: Excellent for architecture explanations
   - **CCS GLM**: Good for PR creation and structured outputs
   - **Amp**: Lightweight alternative for quick tasks

3. **Chain operations**: Use shell pipes to create workflows
   ```bash
   git diff | ai review                  # Review staged changes
   cat file.ts | ai test > file.test.ts  # Generate test file
   git diff main..feature | ai pr        # Create draft PR from branch diff
   ```

4. **Fuzzy match power**: Type minimal characters to find templates
   - `ai com` → matches `commit-zen` or `commit-atomic` (will ask)
   - `ai arc` → matches `architecture-explanation`
   - `ai rev-se` → matches `review-security` (if added)

5. **CCS profiles**: Extend with more models as needed
   ```json
   {
     "name": "review-gpt4",
     "command": "ccs:gpt4 'Review this code: $@'",
     "description": "Review with GPT-4 via CCS"
   }
   ```

6. **Template naming**: Use descriptive prefixes for organization
   - `commit-*` for Git commits
   - `review-*` for different review types
   - `pr-*` for pull request workflows
   - Quick aliases for frequent tasks: `ai slop` for cleanup, `ai tidy` for tidying

## 🛠️ Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Type checking (no compilation errors ✅)
bun run typecheck

# Build standalone executable
bun run build

# Test with specific tools
bun run src/index.ts claude --version
```

## 🏗️ Architecture

- **Modular Design**: Clean separation of concerns (config, detection, UI, lookup)
- **Type Safety**: Full TypeScript coverage with strict mode
- **Security**: Command validation and injection prevention
- **Performance**: Bun runtime for fast startup and minimal dependencies
- **Extensibility**: Plugin-ready architecture for custom tool detectors

## 🔒 Security Features

- **Input Validation**: All commands and arguments validated before execution
- **Command Injection Prevention**: Regex-based sanitization of unsafe characters
- **Template Safety**: Validated placeholder substitution (`$@` syntax only)
- **Path Protection**: Commands validated against allowlist patterns

## 🧪 Testing

```bash
# Run unit tests
bun test

# Test auto-detection
bun run src/index.ts

# Test direct invocation
bun run src/index.ts claude --version
bun run src/index.ts opencode --help

# Test error handling
bun run src/index.ts nonexistent-tool

# Test alias support (if configured)
bun run src/index.ts c  # Should match claude alias

# Test template with arguments
bun run src/index.ts summarize file.txt

# Test template with stdin
cat file.txt | bun run src/index.ts summarize
git diff | bun run src/index.ts review

# Test git diff analysis
bun run src/index.ts claude --diff-staged
bun run src/index.ts --diff-commit HEAD~1
```

## 🌍 Platform Compatibility

### ✅ Tested Platforms

- **macOS**: Full functionality including interactive fuzzy search
- **Linux**: Full functionality including interactive fuzzy search
- **Windows**: Basic functionality, interactive mode may have limitations

### 📋 Platform-Specific Notes

#### macOS & Linux

- Full ANSI color support
- Interactive terminal UI works in most terminals
- Recommended: iTerm2, Terminal.app, VS Code integrated terminal

#### Windows

- Works best in Windows Terminal
- Command Prompt may have limited ANSI support
- PowerShell recommended over cmd.exe
- Some interactive features may be limited

#### Terminal Requirements

- TTY support for interactive mode
- ANSI color support (optional, enhances experience)
- UTF-8 encoding recommended

## 🤝 Contributing

1. Fork and clone
2. Create feature branch
3. Run `bun run typecheck` (no errors allowed)
4. Test on your platform
5. Submit PR with description

## 📄 License

MIT
