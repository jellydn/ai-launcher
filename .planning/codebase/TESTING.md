# Testing Patterns

**Analysis Date:** 2026-06-04

## Test Framework

**Runner:**
- Bun's built-in test runner: `import { describe, test, expect } from "bun:test"`
- Config: none (uses Bun defaults); `package.json:15` `"test": "bun test"`
- Version tied to Bun runtime (devDep `@types/bun`)

**Assertion Library:**
- Bun's `expect` (chained matchers: `.toBe()`, `.toHaveLength()`, `.toContain()`, `.toThrow()`, `.toEqual()`, `.toBeGreaterThan()`, `.toMatch()` etc.)

**Run Commands:**
```bash
bun test                          # Run all tests (per package.json:15, AGENTS.md:23)
bun test src/config.test.ts       # Run specific test file (AGENTS.md:24)
bun run ci                        # typecheck + check + test (package.json:22)
```
- No built-in watch flag exposed in package scripts; `justfile:39` maps `test: bun test`
- No coverage command (see Coverage section)

## Test File Organization

**Location:**
- Co-located with source: `src/<module>.test.ts` alongside `src/<module>.ts`
- Subdirectory support: `src/cli/diff.test.ts` tests `src/cli/diff.ts`
- All 10 test files under src/ (confirmed via fd listing)

**Naming:**
- `<module>.test.ts` exactly (e.g. `config.test.ts`, `lookup.test.ts`, `prompt-escaping.test.ts`, `git-diff.test.ts`)

**Structure:**
```
src/
  config.ts
  config.test.ts
  detect.ts
  detect.test.ts
  ...
  cli/
    diff.ts
    diff.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, test } from "bun:test";
import { findToolByName } from "./lookup";
import type { SelectableItem } from "./types";

const MOCK_ITEMS: SelectableItem[] = [ /* ... */ ];   // module-level fixture data

describe("findToolByName", () => {
  describe("exact name matching", () => {
    test("finds tool by exact name", () => {
      const result = findToolByName("claude", MOCK_ITEMS);
      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("claude");
    });
    // ...
  });
  describe("fuzzy matching", () => { /* ... */ });
});
```
See full: `src/lookup.test.ts:57-267`, `src/config.test.ts:4-120`, `src/detect.test.ts:55`

**Patterns:**
- Setup pattern: module-level consts (MOCK_ITEMS `src/lookup.test.ts:5`, CCS_API_LIST_OUTPUT `src/detect.test.ts:14`) or per-test inline objects. No beforeEach/afterEach used.
- Teardown pattern: none (stateless pure units or live calls that are idempotent in test env).
- Assertion pattern: direct `expect(result.success).toBe(true); expect(result.item?.name).toBe("...");` ; length checks `expect(errors).toHaveLength(0);` ; message contains `expect(errors[0]?.message).toContain("...")` or `.toMatch(/regex/)`
- Nested describe for grouping concerns (exact/alias/suffix/fuzzy/ambiguous in lookup; "parseDiffArgs", "--diff-prompt flag" etc in cli/diff)
- Some tests duplicate tiny logic under test (e.g. `validateToolCommand` helper inside `src/index.test.ts:3`) to isolate pure validation without full module side effects.

## Mocking

**Framework:** None. (Confirmed: no `mock`, `spy`, `bun.mock`, `jest`, `vi.` anywhere in `*.test.ts`)

**Patterns:**
```typescript
// Direct calls to real implementation (accept side effects in env)
const result = isGitRepository();   // src/git-diff.test.ts:9
expect(result).toBe(true);          // test runs inside git repo

// Dynamic import for module functions (in template.test.ts)
const { isSafeCommand } = await import("./template");
expect(isSafeCommand("rm -rf /")).toBe(false);

// Inline test doubles for complex paths (no framework spies)
function substituteTemplateArgs(command: string, args: string[]): string { /* copy logic */ }
```
- `detectGhCopilot` test accepts live result or null `src/detect.test.ts:280`
- No stubbing of spawnSync/fs etc; tests that hit external (git, which) are tolerant.

**What to Mock:**
- (Guideline inferred): avoid; test real behavior where possible. Use for expensive/net I/O if added later.

**What NOT to Mock:**
- Core pure functions (lookup, validation, isSafeCommand, parse*) - test directly.
- Error classes and result shapes.
- Live env checks that are fast (git repo presence, commandExists in detect tests).

## Fixtures and Factories

**Test Data:**
```typescript
const MOCK_ITEMS: SelectableItem[] = [
  { name: "claude", command: "claude", description: "...", isTemplate: false, aliases: ["c"] },
  { name: "commit-zen", ..., isTemplate: true, aliases: ["commit"] },
  // ...
];   // src/lookup.test.ts:5

const CCS_API_LIST_OUTPUT = `...table with | glm | ... [OK] ...`;  // src/detect.test.ts:14
// Variants for ANSI, ASCII pipes, error cases
```
- Hard-coded realistic data: tool lists, CCS output tables, git diff snippets `src/git-diff.test.ts:40`, prompts.
- No shared fixtures/ dir; everything inline or module const in the .test.ts
- For validation: plain object literals passed to validateConfig/validateTemplate `src/config.test.ts:6`

**Location:**
- Inside the test file that needs it. Reused across nested describes in same file.

## Coverage

**Requirements:** None enforced. No coverage threshold or reporting in `package.json`, `justfile`, `AGENTS.md`, or CI (`bun run ci` runs `bun test` only).

**View Coverage:**
```bash
# Not configured; Bun supports experimental --coverage but not used here
bun test --coverage   # would work in Bun but not part of project scripts
```
- Tests focus on behavior confidence per `AGENTS.md:126`, not metric chasing.

## Test Types

**Unit Tests:**
- Majority: pure functions (findToolByName, isSafeCommand, validate*, parse*, toSelectableItems, buildDiffAnalysisPrompt)
- Scope: one module's exported behavior + error paths. Test names describe intent ("rejects template with multiple $@ placeholders")
- Approach: table-like via many small test() cases; cover happy, edge, invalid input, case-insens, ambiguity.

**Integration Tests:**
- Light: e.g. `src/template.test.ts` combines validateConfig + lookup + command build; `src/index.test.ts` reimplements arg parsing/output validation to cover launch paths without spawning.
- `detectInstalledTools` runs real `which`/spawns in env but asserts shape.
- No separate integration dir; mixed in unit files.

**E2E Tests:**
- Not used. Manual via `bun run src/index.ts claude --version` recommended in `AGENTS.md:25` and README. No Playwright/Cypress or full process exec tests in suite.

## Common Patterns

**Async Testing:**
```typescript
test("buildTemplateCommand function exists and works", async () => {
  const { buildTemplateCommand } = await import("./template");
  const result = buildTemplateCommand("amp -x 'Review: $@'", ["file.ts"]);
  expect(result).toBe("amp -x 'Review: file.ts'");
});
```
- Used when testing functions that are sync but import is dynamic to avoid top-level side effects or for future async.
- `fuzzySelect` and `promptForInput` are async (return Promise) but their TTY tests are minimal (`src/fuzzy-select.test.ts:85`) - full interactive not unit-tested here.
- Main entry `src/index.ts:402` uses `main().catch(...)` pattern (tested indirectly via other modules).

**Error Testing:**
```typescript
test("throws NoChangesError when no staged changes", () => {
  expect(() => getGitDiff({ type: "staged" })).toThrow(NoChangesError);
});
test("throws GitDiffError for invalid options", () => {
  expect(() => getGitDiff({ type: "commit" })).toThrow(GitDiffError);
});
// validation
expect(errors.length).toBeGreaterThan(0);
expect(errors[0]?.message).toContain("at most one $@ placeholder");
expect(errors[0]?.message).toMatch(/unsafe (characters|command substitution)/);
```
- Specific error class matching with `.toThrow(Constructor)`
- For non-throwing validators: inspect returned error arrays by path/message
- Also `expect(() => ...).not.toThrow()`
- See `src/git-diff.test.ts:27`, `src/config.test.ts:35`, `src/cli/diff.test.ts:60`

---

*Testing analysis: 2026-06-04*
