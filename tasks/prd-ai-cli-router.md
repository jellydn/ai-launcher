# PRD: AI CLI Router

## Introduction

A quick launcher CLI tool called `ai` that allows users to switch between different AI coding assistants (Claude, OpenCode, Amp, CCS profiles, etc.) using fuzzy search. It auto-detects installed AI CLIs and supports custom aliases and command templates.

## Goals

- Provide a single entry point (`ai`) to launch any AI coding assistant
- Enable fast tool selection via fuzzy search
- Auto-detect installed AI CLI tools
- Support user-defined aliases and command templates
- Zero friction - get into the right AI tool in under 2 seconds

## User Stories

### US-001: Initialize project structure with Bun
**Description:** As a developer, I need the project scaffolded so I can start building.

**Acceptance Criteria:**
- [x] Initialize Bun project with TypeScript
- [x] Set up `src/` directory structure
- [x] Configure `tsconfig.json` for Bun
- [x] Add build script to produce executable
- [x] Typecheck passes

### US-002: Create config file structure
**Description:** As a user, I want a config file to define my AI tools and aliases.

**Acceptance Criteria:**
- [x] Config file location: `~/.config/ai-router/config.json`
- [x] Schema supports: tools list, aliases, command templates
- [x] Creates default config on first run if missing
- [x] Validates config and shows helpful errors
- [x] Typecheck passes

### US-003: Auto-detect installed AI CLIs
**Description:** As a user, I want the tool to find my installed AI assistants automatically.

**Acceptance Criteria:**
- [x] Detects: `claude`, `opencode`, `amp`, `ccs` (with profiles)
- [x] Uses `which` or `command -v` to check availability
- [x] Merges auto-detected tools with config-defined tools
- [x] Config-defined tools take precedence over auto-detected
- [x] Typecheck passes

### US-004: Implement fuzzy search selection
**Description:** As a user, I want to type partial names to quickly filter and select a tool.

**Acceptance Criteria:**
- [x] Running `ai` shows interactive fuzzy search prompt
- [x] Typing filters the list in real-time (e.g., "gl" matches "ccs glm")
- [x] Arrow keys navigate, Enter selects
- [x] Esc or Ctrl+C cancels
- [x] Shows tool name and description in list
- [x] Typecheck passes

### US-005: Support direct tool invocation
**Description:** As a user, I want to skip the menu by passing the tool name directly.

**Acceptance Criteria:**
- [x] `ai claude` launches Claude directly
- [x] `ai g` launches the tool aliased to "g"
- [x] Fuzzy matches if exact match not found (e.g., `ai cl` → claude)
- [x] Shows error if multiple fuzzy matches with no clear winner
- [x] Typecheck passes

### US-006: Support command templates
**Description:** As a user, I want to define command shortcuts that include prompts or arguments.

**Acceptance Criteria:**
- [x] Config supports templates like: `"summarize": "ccs glm -p 'summarize this file'"`
- [x] Templates can include `$@` for pass-through arguments
- [x] `ai summarize main.ts` expands to `ccs glm -p 'summarize this file' main.ts`
- [x] Templates shown in fuzzy search with different indicator
- [x] Typecheck passes

### US-007: Pass through arguments to selected tool
**Description:** As a user, I want to pass additional arguments to the AI tool.

**Acceptance Criteria:**
- [x] `ai claude --help` passes `--help` to claude
- [x] Arguments after tool name are forwarded
- [x] Works with both direct invocation and fuzzy selection
- [x] Typecheck passes

### US-008: Create install/setup script
**Description:** As a user, I want easy installation to get started quickly.

**Acceptance Criteria:**
- [x] `bun run build` produces single executable
- [x] Executable can be symlinked to `/usr/local/bin/ai`
- [x] README includes installation instructions
- [x] Typecheck passes

## Functional Requirements

- FR-1: CLI entry point is `ai` command
- FR-2: Config file at `~/.config/ai-router/config.json`
- FR-3: Auto-detect installed CLIs: claude, opencode, amp, ccs
- FR-4: For `ccs`, detect available profiles from `~/.ccs/config.json`
- FR-5: Fuzzy search using interactive prompt (e.g., using `@inquirer/prompts` or `fzf`-style)
- FR-6: Aliases map short names to full tool commands
- FR-7: Templates map names to full command strings with argument substitution
- FR-8: Spawn selected tool as child process, inheriting stdio
- FR-9: Exit with same code as spawned process

## Non-Goals

- No AI functionality itself - purely a launcher/router
- No session management or history tracking
- No tool-specific integrations or plugins
- No GUI - terminal only

## Technical Considerations

- Use Bun for fast startup and TypeScript support
- Consider `@inquirer/prompts` or `enquirer` for interactive prompts
- Use `fuse.js` or similar for fuzzy matching
- Spawn processes with `Bun.spawn()` or `child_process`
- Keep dependencies minimal for fast cold start

## Config Schema

```json
{
  "tools": [
    {
      "name": "claude",
      "command": "claude",
      "description": "Anthropic Claude CLI"
    },
    {
      "name": "ccs glm",
      "command": "ccs glm",
      "description": "CCS with GLM profile"
    }
  ],
  "aliases": {
    "g": "ccs glm",
    "m": "ccs mm",
    "c": "claude"
  },
  "templates": {
    "summarize": {
      "command": "ccs glm -p 'summarize: $@'",
      "description": "Summarize with GLM"
    }
  }
}
```

## Success Metrics

- Tool selection in under 2 seconds from typing `ai`
- Cold start under 100ms
- Zero configuration needed for basic usage (auto-detect works)

## Open Questions

- Should CCS profiles be auto-detected from `~/.ccs/config.json`?
- Should there be a `ai --add` command to interactively add tools?
- Should recent/frequently used tools be shown first?
