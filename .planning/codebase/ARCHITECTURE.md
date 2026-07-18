# Architecture

**Analysis Date:** 2026-07-18

## Pattern Overview
**Overall:** Modular CLI Monolithic Pattern / Adapter Pattern
**Key Characteristics:**
- Single entry-point multiplexer (`src/index.ts`) for multiple executables.
- Pluggable commands (external tools vs built-in summaries/meetings).
- Configuration-driven tool registry (`config.ts`).
- Adapter-style pattern for LLM Providers in the `summary` feature (`openai`, `anthropic`, `openrouter`, `opencode`, `ollama`).

## Layers
- **CLI / Routing Layer**
  - Purpose: Parses CLI arguments, selects and executes the correct subcommand or fuzzy finder.
  - Location: `src/index.ts`, `src/meeting/index.ts`, `src/summary/index.ts`.
  - Contains: Argument parsing, error catching, `--help`/`--version` handlers.
  - Depends on: Configuration Layer, Feature/Command Layer.
  - Used by: System entry point (via `bun`).
- **Configuration & Discovery Layer**
  - Purpose: Loads user preferences (`~/.config/ai-launcher/config.json`), merges defaults, validates configuration, and detects globally installed tools.
  - Location: `src/config.ts`, `src/detect.ts`, `src/lookup.ts`.
  - Contains: JSON loading/migration, zod-like validation, PATH detection.
  - Depends on: File System (`node:fs`), OS APIs.
  - Used by: CLI / Routing Layer.
- **Core Feature Layer**
  - Purpose: Houses the primary built-in tools (`summary` and `meeting`) as well as the fuzzy selection UI and git-diff logic.
  - Location: `src/summary/`, `src/meeting/`, `src/fuzzy-select.ts`, `src/cli/diff.ts`.
  - Contains: Prompt rendering, JSON parsing, API interactions, UI components.
  - Depends on: Provider Layer.
  - Used by: CLI / Routing Layer.
- **Provider Layer (LLM Adapters)**
  - Purpose: Normalizes interactions with diverse LLM endpoints into a unified stream/generation interface.
  - Location: `src/summary/provider.ts`, `src/summary/providers/`.
  - Contains: Client initializations, fetch calls, auth headers, provider-specific parsing.
  - Depends on: External APIs.
  - Used by: Core Feature Layer.

## Data Flow
**Command Execution Flow:**
1. System passes arguments to `src/index.ts`.
2. Router decides if this is a built-in command (`summary`, `meeting`, `prompt`) or a dynamic tool.
3. If dynamic: `loadConfig()` fetches `config.json` -> `detectInstalledTools()` checks system path -> Lists are merged.
4. `fuzzy-select.ts` displays UI or `lookup.ts` finds the tool by name/alias.
5. Command string is evaluated (`$@` replacement).
6. Child process is spawned using `node:child_process.spawnSync` to run the tool.

**Summary/Meeting Execution Flow:**
1. Router transfers control to `src/summary/index.ts` or `src/meeting/index.ts`.
2. Arguments parsed to determine input (file, url, stdin) and provider/model.
3. Configuration resolved, and the appropriate LLM provider client is instantiated.
4. Input is embedded into prompt templates.
5. Stream is requested from provider and written to `stdout`.
6. Result is parsed (if JSON required) and formatted for the user.

**State Management:**
- Purely stateless CLI application. State is read once at startup (Config file, ENV vars, process args) and maintained in memory for the duration of the short-lived process.

## Key Abstractions
- **Tool / Template**
  - Purpose: Represents an executable command or script template.
  - Examples: `src/types.ts` (`SelectableItem`), `src/template.ts`.
  - Pattern: Command Pattern definition.
- **Provider API**
  - Purpose: Abstract away differences between LLMs (OpenAI, Anthropic, OpenRouter, OpenCode, Ollama).
  - Examples: `src/summary/provider.ts` (`SummaryProvider` interface).
  - Pattern: Strategy/Adapter Pattern.

## Entry Points
- `src/index.ts`
  - Triggers: Command `ai` or built output `./dist/ai`.
  - Responsibilities: Main router, fuzzy finder initialization, git-diff parsing, process spawning.
- `src/meeting/index.ts`
  - Triggers: Command `ai-meeting` or `ai meeting`.
  - Responsibilities: Meeting summarization, extracting risks and action items.
- `src/summary/index.ts`
  - Triggers: Command `ai-summary` or `ai summary`.
  - Responsibilities: General purpose text summarization, input resolution (URL, file, stdin).

## Error Handling
**Strategy:**
- Fail fast with descriptive error messages.
- Typed Error classes for specific domains to handle known vs unknown exceptions at the top level.

**Patterns:**
- Custom Error classes (e.g., `GitCommandError`, `ProviderError`, `SummaryInputError`).
- Global `catch` blocks in main entry points to format output cleanly before `process.exit(1)`.
- Explicit validation functions (`validateConfig`, `validateOutputFile`) returning error structures instead of throwing immediately.

## Cross-Cutting Concerns
- **Configuration:** Handled uniformly by `config.ts` mapping defaults to user definitions.
- **Validation:** Strong typing and runtime checks for configuration items and command arguments (preventing command injection).
- **Process Management:** Wrapper around `spawnSync` handles signal interruptions and forwards exit codes transparently.
