# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Modular single-binary CLI with layered responsibilities

**Key Characteristics:**
- Flat `src/` layout — each module owns one responsibility, no deep nesting (except `src/cli/`)
- Synchronous shell execution (`spawnSync`) throughout — simplifies control flow for a CLI tool
- Immutable data flow — config and tool objects are read, validated, then passed down; no shared mutable state
- Security-first command execution — allowlist validation before any shell invocation

## Layers

**Entry Point / Routing:**
- Purpose: Parse CLI arguments, route to the correct execution path
- Location: `src/index.ts`
- Contains: Argument parsing, tool launching (`launchTool`, `launchToolWithPrompt`), main async entry
- Depends on: lookup, fuzzy-select, config, detect, cli/diff, template
- Used by: Bun runtime (binary entry)

**Tool Management:**
- Purpose: Discover installed AI CLIs and load user configuration
- Location: `src/detect.ts`, `src/config.ts`
- Contains: Which-based detection, CCS profile parsing, JSON config load/save/validate
- Depends on: types, node:child_process, node:fs
- Used by: index.ts

**Selection & Lookup:**
- Purpose: Match user input to a tool — by name, alias, or interactive fuzzy search
- Location: `src/lookup.ts`, `src/fuzzy-select.ts`
- Contains: Priority-based lookup (exact → alias → suffix → substring → fuzzy), interactive TUI with Fuse.js
- Depends on: types, fuse.js
- Used by: index.ts, cli/diff.ts

**Git Diff Analysis:**
- Purpose: Extract git diffs and build AI analysis prompts
- Location: `src/git-diff.ts`, `src/cli/diff.ts`, `src/prompts.ts`
- Contains: Git command execution, argument parsing for `--diff-staged`/`--diff-commit`, prompt assembly
- Depends on: errors, lookup, fuzzy-select, types
- Used by: index.ts

**Template System:**
- Purpose: Validate and execute pre-configured command templates
- Location: `src/template.ts`
- Contains: Command validation (allowlist regex), `$@` argument substitution, shell-safe parsing
- Depends on: types
- Used by: index.ts

**Utilities:**
- Purpose: Supporting concerns — versioning, upgrades, branding
- Location: `src/upgrade.ts`, `src/logo.ts`, `src/version.ts`
- Contains: GitHub release fetching, binary replacement with checksum verification, ASCII art
- Depends on: node:https, node:crypto, node:fs
- Used by: index.ts

**Error Hierarchy:**
- Purpose: Typed error classes for git diff operations
- Location: `src/errors.ts`
- Contains: `GitDiffError` base → `NotGitRepositoryError`, `InvalidGitRefError`, `NoChangesError`, `GitCommandError`
- Depends on: nothing
- Used by: git-diff.ts, cli/diff.ts

## Data Flow

**Standard tool launch:**
1. `index.ts` parses argv; extracts tool query and remaining args
2. `lookup.ts` matches query → tool (or falls back to `fuzzy-select.ts` interactive TUI)
3. `template.ts` validates the command if it's a template invocation
4. `index.ts` calls `spawnSync` with validated command + args, `shell: true`, `stdio: inherit`

**Diff analysis launch:**
1. `index.ts` detects `--diff-staged` or `--diff-commit` flag, delegates to `cli/diff.ts`
2. `cli/diff.ts` calls `git-diff.ts` to run `git diff` via `spawnSync`
3. `prompts.ts` builds an analysis prompt embedding the diff text
4. Tool is selected (by name arg or fuzzy select), then launched with the prompt via single-quoted shell arg

**Upgrade flow:**
1. `upgrade.ts` fetches latest release metadata from GitHub API
2. Compares versions with `semver`
3. Downloads platform binary, verifies SHA256 checksum
4. Backs up current binary, atomically replaces it

**State Management:**
- No shared mutable state between modules
- User config is the only persistent state — loaded once at startup, written only on explicit save
- Terminal raw-mode state in `fuzzy-select.ts` is scoped to the interactive selection lifecycle

## Key Abstractions

**Tool:**
- Purpose: Represents a detected or configured AI CLI assistant
- Examples: `src/types.ts` (`Tool` interface), populated by `src/detect.ts`
- Pattern: Plain data interface; no methods

**SelectableItem:**
- Purpose: Unified item shape for both tools and templates in the fuzzy selector
- Examples: `src/types.ts`, used in `fuzzy-select.ts` and `lookup.ts`
- Pattern: Discriminated union via `type` field (`"tool" | "template"`)

**LookupResult / SelectionResult:**
- Purpose: Result-object pattern — success/failure without exceptions in the happy path
- Examples: `src/lookup.ts` (`LookupResult`), `src/fuzzy-select.ts` (`SelectionResult`)
- Pattern: `{ success: true, item }` or `{ success: false, error }`

## Entry Points

**CLI binary:**
- Location: `src/index.ts` → compiled to `dist/ai`
- Triggers: User runs `ai [tool] [args...]`
- Responsibilities: Argument parsing, routing, tool launching

**Build script:**
- Location: `scripts/build.sh`
- Triggers: `bun run build`
- Responsibilities: Generate `src/version.ts`, compile standalone binary

## Error Handling

**Strategy:** Typed custom errors for git operations; guard clauses and early exits elsewhere

**Patterns:**
- `errors.ts` hierarchy for git-related failures — caught by type in `cli/diff.ts` for user-friendly messages
- `process.exit(1)` for unrecoverable CLI errors after printing to stderr
- Result objects (`LookupResult`, `SelectionResult`) avoid throwing in lookup/selection paths
- Top-level `main().catch()` in `index.ts` catches any unhandled errors

## Cross-Cutting Concerns

**Logging:** `console.error` for errors, `console.log` for user-facing output. No logging framework.

**Validation:** Regex allowlists validate commands (`SAFE_COMMAND_PATTERN`), arguments (max 200 chars, no shell metacharacters), and git refs (no leading `-`).

**Authentication:** Not applicable — this tool launches other authenticated CLIs; it holds no credentials itself.

---

*Architecture analysis: 2026-01-31*
