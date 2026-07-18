# Testing Patterns

**Analysis Date:** 2026-07-18

## Test Framework
- **Runner:** `bun test`
- **Assertion Library:** `bun:test` built-in assertions (`expect`, `toBe`, `toEqual`, `toThrow`).
- **Run Commands:** `bun test` (mapped to `test` script in `package.json`). CI runs typecheck, biome check, and `bun test`.

## Test File Organization
- **Location:** Co-located with source files (e.g., `src/index.test.ts` tests `src/index.ts`).
- **Naming:** Suffix with `.test.ts`.
- **Structure:** Uses `describe` blocks to group tests by function or module, and `test` blocks for individual cases. Setup/teardown with `beforeEach` and `afterEach`.

## Test Structure
- **Suite Organization:** Tests are organized structurally mapping closely to the functions they test.
  ```ts
  import { describe, expect, test } from "bun:test";
  
  describe("validateToolCommand", () => {
    test("accepts simple command", () => {
      expect(validateToolCommand("claude")).toBe(true);
    });
  });
  ```
- **Patterns:** Tests cover both positive ("accepts...") and negative ("rejects...") cases meticulously.

## Mocking
- **Framework:** Uses `bun:test` utilities like `spyOn`.
- **Patterns:** Mocking environment variables and global objects like `process.exit`.
  ```ts
  const exitSpy = spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit");
  });
  ```
- **What to Mock:** Side effects like `process.exit`, `console.log`, file system access, and network requests.
- **What NOT to Mock:** Pure functions (e.g., parameter parsing, string formatting, validations).

## Fixtures and Factories
- **Test Data patterns:** Mostly inline object structures defined within `describe` blocks or explicitly in the `test` itself.
- **Location:** At the top of `describe` blocks. E.g., `const sampleSummary = { ... }`.

## Coverage
- **Requirements:** No explicit coverage thresholds strictly defined in `package.json`.
- **View Coverage command:** Run natively via bun with `bun test --coverage` (though not currently set as default in package script).

## Test Types
- **Unit:** Dominant test type in the project, heavily validating string parsing, argument checks, validation regexes, and environment config resolution.
- **Integration:** Some tests span CLI argument parsing to configuration resolution.
- **E2E:** Not explicitly defined in this test suite.

## Common Patterns
- **Async Testing:** No complex async assertions used widely in the CLI parsing, but standard `async/await` would be supported by Bun test if needed.
- **Error Testing:** Expecting functions to throw or mock implementations to trigger exceptions.
  ```ts
  test("throws when --model is missing its value", () => {
    expect(() => parseArgs(["--model"])).toThrow("--model requires a value");
  });
  ```
