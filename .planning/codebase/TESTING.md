# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Runner:**
- Bun native test framework (`bun:test`)
- Config: None (convention-based; Bun auto-discovers `*.test.ts`)

**Assertion Library:**
- Bun's built-in `expect`

**Run Commands:**
```bash
bun test                          # Run all tests
bun test src/config.test.ts       # Run a specific test file
```

## Test File Organization

**Location:**
- Co-located with source: `src/<module>.test.ts` lives alongside `src/<module>.ts`

**Naming:**
- `<module>.test.ts` mirrors the source module name exactly

**Test files (7 total):**
- `src/config.test.ts`
- `src/detect.test.ts`
- `src/fuzzy-select.test.ts`
- `src/lookup.test.ts`
- `src/template.test.ts`
- `src/upgrade.test.ts`
- `src/git-diff.test.ts`

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, test } from "bun:test";
import { functionUnderTest } from "./module";

describe("module name or feature area", () => {
  describe("specific function or behavior", () => {
    test("describes expected outcome", () => {
      // Arrange → Act → Assert
      const result = functionUnderTest(input);
      expect(result).toBe(expected);
    });
  });
});
```

**Patterns:**
- Nested `describe` blocks: outer = module/feature, inner = specific function or scenario
- Test names describe the expected outcome (not the method called)
- No shared `beforeEach`/`afterEach` — each test is self-contained
- Inline helper functions when test logic needs shared setup (e.g., `substituteTemplateArgs` defined inside a `describe` block in `template.test.ts`)

## Mocking

**Framework:** Bun's built-in `jest.spyOn` / `jest.mock` (available via `bun:test`)

**Patterns:**
```typescript
// Spy on child_process for detection tests
import { spawnSync } from "node:child_process";
jest.spyOn(globalThis, "spawnSync"); // used in detect.test.ts
```

**What to Mock:**
- External process calls (`spawnSync`) when testing detection logic
- File system operations when testing config loading

**What NOT to Mock:**
- Internal module functions — tests import and call them directly
- Fuse.js — tested through real fuzzy matching behavior

## Fixtures and Factories

**Test Data:**
```typescript
// Inline fixtures — tool objects constructed directly in tests
const tools: Tool[] = [
  { name: "claude", command: "claude", aliases: ["cl"] },
  { name: "amp", command: "amp", aliases: [] },
];

// Config fixtures for validation tests
const validConfig: Config = {
  tools: [...],
  templates: [...],
};
```

**Location:**
- Inline within test files — no shared fixture directory
- Each test constructs its own minimal data

## Coverage

**Requirements:** None enforced (no coverage threshold configured)

**View Coverage:**
```bash
bun test --coverage
```

## Test Types

**Unit Tests:**
- Primary testing strategy — each module tested in isolation
- Pure functions tested directly (lookup matching, template substitution, config validation)
- Error cases tested via `expect(...).toThrow(ErrorType)`

**Integration Tests:**
- Limited — `template.test.ts` uses dynamic `import()` to test the full exported API:
  ```typescript
  test("buildTemplateCommand function exists and works", async () => {
    const { buildTemplateCommand } = await import("./template");
    const result = buildTemplateCommand("amp -x 'Review: $@'", ["file.ts"]);
    expect(result).toBe("amp -x 'Review: file.ts'");
  });
  ```

**E2E Tests:**
- Not used

## Common Patterns

**Async Testing:**
```typescript
test("dynamic import works", async () => {
  const { validateTemplateCommand } = await import("./template");
  expect(validateTemplateCommand("rm -rf /")).toBe(false);
});
```

**Error Testing:**
```typescript
// Typed error assertion
test("throws NoChangesError when no staged changes", () => {
  expect(() => getGitDiff({ type: "staged" })).toThrow(NoChangesError);
});

// Generic error class assertion
test("throws GitDiffError for invalid options", () => {
  expect(() => getGitDiff({ type: "commit" })).toThrow(GitDiffError);
});
```

**Security Testing:**
```typescript
// Template security — reject dangerous patterns
test("rejects shell operators and command substitution", async () => {
  const { validateTemplateCommand } = await import("./template");
  expect(validateTemplateCommand("amp && rm -rf /")).toBe(false);
  expect(validateTemplateCommand("amp $(whoami)")).toBe(false);
  expect(validateTemplateCommand("sudo amp")).toBe(false);
});

// Accept safe special characters in prompts
test("accepts special characters in prompts", async () => {
  const { validateTemplateCommand } = await import("./template");
  expect(validateTemplateCommand("claude -p 'Check <script> tags: $@'")).toBe(true);
});
```

---

*Testing analysis: 2026-01-31*
