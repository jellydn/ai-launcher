# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Duplicated Validation Patterns:**
- Issue: Command/argument validation regex patterns are defined independently in multiple modules with slight differences
- Files: `src/index.ts` (`validateArguments`), `src/config.ts` (`validateTool`), `src/detect.ts` (`validateCommandName`), `src/template.ts` (`SAFE_COMMAND_PATTERN`)
- Impact: Changing security rules requires updating multiple locations; risk of drift
- Fix approach: Extract shared validation functions into a `src/validate.ts` module

**Shell Execution with `shell: true`:**
- Issue: `spawnSync` in `src/index.ts:111` uses `shell: true` for tool launching, adding an unnecessary shell parsing layer
- Files: `src/index.ts` (lines 109–115)
- Impact: Validation regex must be comprehensive enough to cover shell metacharacters
- Fix approach: Where possible, use array-based spawn without `shell: true`; reserve `shell: true` only for template commands that require it

**Prompt Escaping Fragility:**
- Issue: Single-quote escaping (`prompt.replace(/'/g, "'\\''"`) in `src/index.ts:124` is correct but undocumented and untested
- Files: `src/index.ts` (lines 117–134)
- Impact: Breaks silently if escaping logic is modified; no unit test coverage
- Fix approach: Add dedicated unit tests for prompt escaping edge cases

## Known Bugs

**Git Diff Silent Truncation:**
- Symptoms: Very large diffs (>10MB) are silently truncated by `maxBuffer`
- Files: `src/git-diff.ts:33`
- Trigger: Repositories with large binary diffs or very large changesets
- Workaround: None currently; user gets a partial diff without warning

**Fuzzy Select Terminal State Leak:**
- Symptoms: If an exception escapes the key-handler loop, raw mode and hidden cursor may not be restored
- Files: `src/fuzzy-select.ts` (lines 102–286)
- Trigger: Uncaught exception during interactive selection
- Workaround: Restart the terminal session

## Security Considerations

**Command Injection Prevention:**
- Risk: User-supplied arguments flow into shell execution
- Files: `src/index.ts`, `src/cli/diff.ts`, `src/git-diff.ts`
- Current mitigation: Regex allowlist for commands/args; blocklist for `&&`, `||`, `;`, `$(...)`, backticks, `sudo`, `rm -rf`, redirects; single-quote escaping for prompts
- Recommendations: Add integration-level tests exercising common injection vectors; document why certain characters (e.g., `|` in prompts) are allowed

**Git Reference Injection:**
- Risk: The `ref` parameter in `--diff-commit <ref>` could inject git flags
- Files: `src/cli/diff.ts:50–53`
- Current mitigation: `ref.startsWith("-")` check rejects flag-style inputs
- Recommendations: Tighten to a whitelist pattern (alphanumeric, `.`, `/`, `~`, `^`, `@`) for valid git refs

**Upgrade Binary Replacement (TOCTOU):**
- Risk: Window between checksum verification and binary replacement could be exploited
- Files: `src/upgrade.ts` (binary replacement logic)
- Current mitigation: Backup and restore on failure; checksum verified before write
- Recommendations: Consider atomic rename instead of write-then-delete

## Performance Bottlenecks

**Fuse.js Re-instantiation:**
- Problem: A new `Fuse` instance is created on each query in both `fuzzy-select.ts` and `lookup.ts`
- Files: `src/fuzzy-select.ts`, `src/lookup.ts`
- Cause: Instance created inside the function rather than cached
- Improvement path: Instantiate once when the item list is known; reuse across queries

**CCS Profile Detection Regex:**
- Problem: Complex regex with alternation runs per-line on `ccs api list` output
- Files: `src/detect.ts` (CCS profile parsing)
- Cause: Unoptimized parsing of table-formatted CLI output
- Improvement path: Pre-compile regex; consider string splitting instead of regex for table parsing

## Fragile Areas

**Interactive Terminal UI:**
- Files: `src/fuzzy-select.ts` (lines 56–287)
- Why fragile: Complex ANSI escape code generation, terminal width detection, line-wrapping math, raw-mode lifecycle management
- Safe modification: Extract rendering into pure functions; test width/wrapping calculations independently
- Test coverage: Only the `toSelectableItems` export helper is tested; the interactive rendering and key handlers have no unit tests

**Config Validation:**
- Files: `src/config.ts` (lines 34–149)
- Why fragile: Multiple validation functions with overlapping but not identical logic
- Safe modification: Consolidate validation into a single pass; add tests for config merge/override behavior
- Test coverage: Good for basic validation; missing edge cases around malformed JSON and permission errors

**Lookup Priority Chain:**
- Files: `src/lookup.ts` (lines 39–103)
- Why fragile: Five-tier priority ordering (exact → alias → suffix → substring → fuzzy) with a magic-number threshold (`0.05`) for fuzzy match confidence
- Safe modification: Extract priority tiers into an enum or named constants; document the threshold rationale
- Test coverage: Well tested; ambiguity detection threshold is the main undocumented assumption

## Scaling Limits

**Git Diff Buffer:**
- Current capacity: 10MB (`src/git-diff.ts:33` — `maxBuffer: 10 * 1024 * 1024`)
- Limit: `spawnSync` returns truncated output above this limit with no error
- Scaling path: Validate output size; warn user; or switch to streaming (`spawn` + chunk collection) for large repos

**Fuzzy Select Visible Items:**
- Current capacity: 10 items visible at once (`src/fuzzy-select.ts`)
- Limit: Works fine with scrolling for moderate lists; edge cases with very narrow terminals (<40 cols)
- Scaling path: Scrolling is already implemented; narrow-terminal rendering needs hardening

## Dependencies at Risk

**fuse.js (7.1.0):**
- Risk: Low — actively maintained, widely used
- Impact: Core feature; all fuzzy matching depends on it
- Migration plan: Could implement simple trie/substring matching internally if needed

**semver (7.6.0):**
- Risk: Very low — stable, widely used
- Impact: Only the upgrade feature
- Migration plan: Version comparison is simple enough to rewrite with string splitting if needed

## Missing Critical Features

**Error Recovery in Interactive Mode:**
- Problem: No cleanup guarantee if an error occurs during fuzzy selection (e.g., git diff fails after TUI is active)
- Blocks: Graceful error handling in chained tool-selection + diff-analysis flows

**Diff Command Integration Tests:**
- Problem: `src/cli/diff.ts` (`executeDiffCommand`) has no test coverage; only the underlying `git-diff.ts` primitives are tested
- Blocks: Confident refactoring of the diff analysis command flow

## Test Coverage Gaps

**Interactive Terminal UI:**
- What's not tested: `fuzzySelect()` main function — key handlers, search filtering, scrolling, ANSI rendering
- Files: `src/fuzzy-select.ts` (lines 83–287)
- Risk: Core UX feature could regress silently
- Priority: High

**Command Launching:**
- What's not tested: `launchTool()` and `launchToolWithPrompt()` — argument splitting, shell escaping, prompt building
- Files: `src/index.ts` (lines 67–134)
- Risk: Security-relevant shell interaction logic
- Priority: High

**Diff Analysis Orchestration:**
- What's not tested: `executeDiffCommand()` end-to-end — tool selection + prompt building + diff retrieval
- Files: `src/cli/diff.ts` (lines 65–117)
- Risk: New feature, interaction between components untested
- Priority: Medium

**Template Quoting Edge Cases:**
- What's not tested: `parseTemplateCommand()` with nested or escaped quotes
- Files: `src/template.ts`
- Risk: Malformed templates could produce incorrect or unsafe commands
- Priority: Medium

**Config Error Handling:**
- What's not tested: Malformed JSON, missing directories, permission errors during config load/save
- Files: `src/config.ts` (lines 173–188)
- Risk: App crashes instead of graceful degradation
- Priority: Low

---

*Concerns audit: 2026-01-31*
