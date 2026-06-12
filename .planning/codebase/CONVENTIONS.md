# Coding Conventions

**Analysis Date:** 2026-06-04

## Naming Patterns

**Files:**
- Source files use kebab-case for multi-word (e.g. `fuzzy-select.ts`, `git-diff.ts`, `prompt-escaping.test.ts`) per `AGENTS.md:65`
- Simple names camel or single: `config.ts`, `index.ts`, `detect.ts`, `lookup.ts`, `template.ts`
- Co-located tests: `<module>.test.ts` (e.g. `src/config.test.ts`, `src/cli/diff.test.ts`)
- Generated: `src/version.ts` (overwritten by `scripts/build.sh:4`)
- Type definition file: `src/types.ts`

**Functions:**
- camelCase: `detectInstalledTools`, `findToolByName`, `isSafeCommand`, `loadConfig`, `validateConfig` (see `src/detect.ts:255`, `src/lookup.ts:11`, `src/template.ts:22`, `src/config.ts:248`)
- Explicit return types required for public/exported functions per `AGENTS.md:39` and `tsconfig.json:14` strict
- Examples: `export function findToolByName(query: string | undefined, items: SelectableItem[]): LookupResult` `src/lookup.ts:11`
- Internal helpers also typed: `function handleChildProcessError(child: SpawnSyncReturns<string | Buffer>): void` `src/index.ts:22`

**Variables:**
- camelCase for let/const: `query`, `selectedIndex`, `filteredItems`, `stdinContent`
- UPPER_SNAKE_CASE for module constants: `CONFIG_PATH`, `CONFIG_DIR`, `SAFE_COMMAND_PATTERN`, `DANGEROUS_PATTERNS`, `EXIT_CODE_SUCCESS`, `KNOWN_TOOLS`, `MAX_DIFF_BUFFER_SIZE` (`src/config.ts:7`, `src/template.ts:7`, `src/index.ts:17`, `src/detect.ts:13`, `src/git-diff.ts:15`)
- Boolean prefixes: `isSafe`, `hasValidName`, `isTemplate`, `useStdin`

**Types:**
- PascalCase for interfaces and exported types: `Tool`, `Template`, `Config`, `SelectableItem`, `LookupResult`, `SelectionResult`, `GitDiffOptions`, `DiffCommandOptions` (`src/types.ts:3`, `src/lookup.ts:4`, `src/fuzzy-select.ts:4`, `src/git-diff.ts:9`)
- Type aliases: `KnownToolName`, `SuggestedInstallTool`, `AuthType`, `ParsedCommand` (`src/detect.ts:103`, `src/types.ts:1`, `src/template.ts:1`)
- Use `unknown` instead of `any` for dynamic (e.g. `validateTool(tool: unknown` `src/config.ts:91`), enforced by biome `biome.json:26` and `AGENTS.md:38`

## Code Style

**Formatting:**
- Tool: Biome (configured in `biome.json`, run via `bun run format`)
- Key settings from `biome.json:16`:
  - indentStyle: "space", indentWidth: 2
  - lineWidth: 100
  - lineEnding: "lf"
- javascript.formatter `biome.json:44`:
  - quoteStyle: "double"
  - semicolons: "always"
  - trailingCommas: "es5"
  - arrowParentheses: "always"
- Matches AGENTS.md:47-49 exactly

**Linting:**
- Tool: Biome (`bun run lint`, `biome check`)
- Key rules from `biome.json:23` and `AGENTS.md:50`:
  - suspicious.noExplicitAny: "error"
  - correctness.noUnusedVariables: "error"
  - style.useConst: "error"
  - style.noNonNullAssertion: "warn"
  - noConsole: "off" (allowed for CLI)
- TSConfig enforces: "strict": true `tsconfig.json:14`, "noUnusedLocals": true, "noUnusedParameters": true, "noUncheckedIndexedAccess": true `tsconfig.json:17`, "noImplicitOverride": true
- Development workflow requires `bun run typecheck && bun run check` before tests (`AGENTS.md:130`)

## Import Organization

**Order:**
1. External libraries (e.g. `import Fuse from "fuse.js"`, `import { gte as semverGte } from "semver"`) - `src/fuzzy-select.ts:1`, `src/lookup.ts:1`, `src/upgrade.ts:6`
2. Node built-ins with `node:` prefix (required): `import { spawnSync } from "node:child_process"`, `import { readFileSync } from "node:fs"` etc. `src/index.ts:3-6`, `src/config.ts:1-3`, `src/detect.ts:1`
3. Type-only imports using `import type` (verbatimModuleSyntax): `import type { SpawnSyncReturns } from "node:child_process"` `src/index.ts:3`; `import type { Config, ConfigValidationError, Template } from "./types"` `src/config.ts:5`
4. Internal relative modules: `./config`, `./detect`, `./fuzzy-select`, `./lookup`, `./template`, `./cli/diff` (no index barrel) `src/index.ts:7-15`
- Grouped as described in `AGENTS.md:60`: external, types, internal
- `node:` prefix mandated `AGENTS.md:58`

**Path Aliases:**
- `@/*` -> `src/*` configured in `tsconfig.json:23-25`
- Used? Not heavily in current sources (direct relatives preferred for small codebase)

## Error Handling

**Patterns:**
- Lookup/validation results use discriminated success pattern (not exceptions for expected cases): `export interface LookupResult { success: boolean; item?: SelectableItem; error?: string; candidates?: SelectableItem[]; }` then `return { success: false, error: "..." }` or `{ success: true, item }` `src/lookup.ts:4-77`, `src/config.ts:185` (validateConfig returns ConfigValidationError[])
- Guard clauses at top of functions (per `AGENTS.md:69` example): `if (!query) return { success: false... }`; `if (!trimmed) return false;` `src/template.ts:24`; `if (!isSafeCommand(command)) { console.error... process.exit(1); }` `src/index.ts:149`
- Custom error hierarchy for domain: `src/errors.ts:5` - `GitDiffError` base, `NotGitRepositoryError`, `InvalidGitRefError`, `NoChangesError`, `GitCommandError`, `FileOutputError` (all extend Error with .name set)
- try/catch around I/O and external: `catch (error) { console.error( error instanceof Error ? error.message : error ) ... process.exit(1) }` `src/index.ts:402`, `src/upgrade.ts:225`, `src/config.ts:235`
- Validation: collect errors array then throw or return; formatValidationErrors `src/config.ts:211`
- CLI: process.exit with specific codes (EXIT_CODE_* constants `src/index.ts:17-20`), never unhandled in main path
- Security: regex allowlists before exec/spawn (e.g. `validateArguments`, `isValidGitRef` `src/cli/diff.ts:32`), no denylists only
- Stdin read wrapped: `try { ... } catch { return null; }` `src/index.ts:95`

## Logging

**Framework:** console (no logger lib; `console.log`, `console.error`, `console.warn`)

**Patterns:**
- User-facing output: `console.log(\`Running: ${...}\`)`, success `✅`, errors prefixed `❌` or `Error:`
- Errors always to stderr via console.error
- Debug-ish: only in upgrade/download progress, diff size warnings
- Never console in production paths except intentional CLI UX
- In tests: no suppression, rely on expect for behavior

## Comments

**When to Comment:**
- Explain non-obvious: buffer limits, why delay for ESC vs arrows `src/fuzzy-select.ts:236`, security rationale for backticks in DANGEROUS_PATTERNS `src/template.ts:10`
- Generated file header only `src/version.ts:1`
- Avoid over-commenting; code is communication per `AGENTS.md:32`

**JSDoc/TSDoc:**
- Used for public API surface especially error-throwing functions: `@throws {NotGitRepositoryError}` `src/git-diff.ts:75`, `@throws` lists in `src/git-diff.ts:19-24`
- Module-level: `/** Prompt generation for AI analysis */` `src/prompts.ts:3`; `/** Curated subset... */` `src/detect.ts:105`
- Class docs for custom errors `src/errors.ts:2`
- No TSDoc on every internal; prefer descriptive names + small functions

## Function Design

**Size:**
- Small and focused: most <30 LOC body; e.g. `isSafeCommand` `src/template.ts:22-29` is pure guard+regex; `parseDiffArgs` handles one concern
- Core principles `AGENTS.md:31`: Small, Safe Steps; Separate Tidying from Behavior Changes

**Parameters:**
- Typed strictly, no `any`; use `unknown` for JSON input then cast+check inside validators
- Defaults for optionals: `launchTool(command: string, extraArgs: string[] = [], ...)` `src/index.ts:148`
- Destructuring in callers but functions take clear objects (e.g. `GitDiffOptions`)

**Return Values:**
- Explicit types always for exported
- Result objects over throwing for lookup/validate: `LookupResult`
- `never` for functions that always exit: `launchToolWithPrompt(...): never` `src/index.ts:194`
- void for side-effect only like `ensureConfigDir(): void`

## Module Design

**Exports:**
- Named exports only (no default except biome side)
- Public API per file: config exports load/validate/getConfigPath/validateTemplate; lookup exports findToolByName + interface; etc.
- Re-export not used; consumers import directly from module `src/index.ts:7-15`

**Barrel Files:**
- None. Architecture diagram in `AGENTS.md:107` lists flat src/ modules; imports are specific (e.g. `import { loadConfig } from "./config"`). Avoids coupling.

---

*Convention analysis: 2026-06-04*
