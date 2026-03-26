# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- kebab-case for multi-word modules: `fuzzy-select.ts`, `git-diff.ts`
- Single lowercase word when short: `config.ts`, `detect.ts`, `types.ts`, `errors.ts`
- Tests mirror source name: `config.test.ts`, `git-diff.test.ts`
- Sub-commands in `cli/`: `cli/diff.ts`

**Functions:**
- camelCase: `detectTools`, `findToolByName`, `buildDiffAnalysisPrompt`
- Boolean-returning: `is`/`has` prefix: `isGitRepository`, `isSafeCommand`
- Action-oriented: `ensureGitRepository`, `parseDiffArgs`, `executeDiffCommand`

**Variables:**
- camelCase: `diffFlagIndex`, `analysisPrompt`, `toolCommand`
- Constants: UPPER_SNAKE_CASE: `SAFE_COMMAND_PATTERN`, `CONFIG_PATH`, `MAX_ARG_LENGTH`

**Types:**
- PascalCase interfaces: `Tool`, `Config`, `SelectableItem`, `DiffCommandOptions`
- Result types follow `<Feature>Result` pattern: `LookupResult`, `SelectionResult`

## Code Style

**Formatting:**
- Biome (`@biomejs/biome` 2.3.11)
- Line width: 100 characters
- Indentation: 2 spaces
- Quotes: double quotes
- Semicolons: always

**Linting:**
- Biome
- Key rules: `noExplicitAny` (error), `noUnusedVariables` (error), `useConst` (error), `noNonNullAssertion` (warn)
- TypeScript strict: `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`

## Import Organization

**Order:**
1. Node.js built-ins with `node:` prefix: `import { spawnSync } from "node:child_process"`
2. External packages: `import Fuse from "fuse.js"`
3. Type-only imports (separate): `import type { Tool } from "./types"`
4. Internal modules: `import { findToolByName } from "./lookup"`

**Path Aliases:**
- `@/*` resolves to `src/*` (defined in `tsconfig.json`)
- Relative imports used within `src/` in practice

## Error Handling

**Patterns:**
- Custom error classes for domain errors (`src/errors.ts`): `GitDiffError` → `NotGitRepositoryError`, `InvalidGitRefError`, `NoChangesError`, `GitCommandError`
- Result objects for non-exceptional failures: `{ success: true, item }` / `{ success: false, error: "..." }`
- Guard clauses with `process.exit(1)` for unrecoverable CLI errors after `console.error`
- Top-level `main().catch()` to catch unhandled rejections

## Logging

**Framework:** `console` (no library)

**Patterns:**
- `console.error` for errors and warnings (prefixed with emoji: `❌`, `⚠️`)
- `console.log` for user-facing status and output
- No debug/trace logging

## Comments

**When to Comment:**
- JSDoc on exported functions that have non-obvious parameters or throw behavior
- `@throws` tags used on functions that throw typed errors (e.g., `getGitDiff`)
- Block comment at top of `errors.ts` and `cli/diff.ts` for module-level intent
- No inline comments on obvious logic

**JSDoc/TSDoc:**
- Used selectively on key exported functions; not on every function
- Example: `/** Get git diff based on options @throws {InvalidGitRefError} ... */`

## Function Design

**Size:** Small, focused functions — typically 10-30 lines. Complex flows split into `parse` + `execute` pairs (e.g., `parseDiffArgs` / `executeDiffCommand`).

**Parameters:** Plain objects for multi-option functions (`GitDiffOptions`, `DiffCommandOptions`); simple positional args for 1-3 params.

**Return Values:** Result objects (`LookupResult`, `SelectionResult`) for functions that can fail without throwing. `void` or `never` for functions that exit the process on failure.

## Module Design

**Exports:** Each module exports only what other modules need. No re-exports or barrel files.

**Barrel Files:** Not used. Imports reference source modules directly.

---

*Convention analysis: 2026-01-31*
