# Configuration

Config file location: `~/.config/ai-switcher/config.json`

A default config is created on first run.

## Config Structure

```json
{
  "tools": [...],
  "templates": [...]
}
```

## Tools

Array of AI tools with the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name and primary lookup key |
| `command` | ✅ | The CLI command to execute |
| `description` | ❌ | Shown in fuzzy search list |
| `aliases` | ❌ | Array of short aliases (e.g., `["c", "cl"]`) |
| `promptCommand` | ❌ | Alternative command for `--diff-*` prompts |
| `promptUseStdin` | ❌ | If `true`, pipe prompt via stdin instead of argument |

### Example Tools Configuration

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
  ]
}
```

## Templates

Array of command templates with the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Template name (shown with [T] indicator) |
| `command` | ✅ | Command string, use `$@` for argument substitution |
| `description` | ✅ | Template description |
| `aliases` | ❌ | Array of short aliases |

### Example Templates Configuration

```json
{
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

## Git Diff Prompt Configuration

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

## Auto-Detection

The following CLIs are auto-detected if installed and available in PATH:

- `claude` - Anthropic Claude CLI
- `opencode` - OpenCode AI assistant
- `amp` - Sourcegraph Amp CLI
- `ccs` - **Claude Code Switch** (with profile detection via `ccs api list`)

### Precedence Rules

1. User-defined tools in config.json (highest priority)
2. Auto-detected tools (fallback)
3. Tools with same name or command are de-duplicated

### CCS Profile Auto-Detection

Runs `ccs api list` to detect active profiles. Each profile with `[OK]` status becomes available as `ccs:<profile-name>`.

## Full Example Configuration

See [example-config.json](https://github.com/jellydn/ai-cli-switcher/blob/main/example-config.json) in the repository for a complete example.
