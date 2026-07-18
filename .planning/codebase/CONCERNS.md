# Codebase Concerns

**Analysis Date:** 2026-07-18

## Fixed in branch `fix/codebase-concerns`

Resolved (see git history; do not re-list as active debt below):
- Validation extraction (`src/validators.ts`), AGENTS.md architecture list
- Version from package.json (build embeds constant then restores)
- Windows `commandExists` (`where`/`which`), cmd shadow skip, detection cache
- Segment-based output paths (incl. `./` prefix, nested hidden, Windows reserved names)
- Multi-`$@` rejection; install JSON via jq/node (env-safe name pass)
- Prompt/tool launch uses `shell: false` with quote-aware argv
- Chunked stdin with size cap + EAGAIN backoff
- Upgrade fetch timeouts + download size cap

Still open: TUI ESC race, CCS table parse brittleness, dual release/build paths, zod/schema migration, residual shell use in other paths if any, upgrade signature verification, performance items.


## Tech Debt

**[Validation logic duplication in tests]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Issue: Multiple test files duplicate and reimplement core validation functions (validateArguments, isValidOutputPath, validateToolCommand, substitute helpers) as local copies instead of importing the real implementations.
- Files: `src/index.test.ts`, `src/template.test.ts`
- Impact: Logic drift risk between source security checks and tests; changes to patterns (e.g. safe chars) require dual edits; violates "test behavior" guideline.
- Fix approach: Extract pure validators to e.g. src/validators.ts (or export from modules), import in tests and source; remove copies.

**[Outdated and incomplete architecture documentation]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Issue: AGENTS.md architecture section lists only 10 src files and is missing later additions (cli/diff.ts, errors.ts, git-diff.ts, prompts.ts); historical docs use legacy names "ai-router"/"ai-switcher".
- Files: `AGENTS.md`, `tasks/prd-ai-cli-router.md`, `scripts/ralph/progress.txt`
- Impact: Misleading for agents/humans; search hits on old names; incorrect mental model of modules.
- Fix approach: Update AGENTS.md file list + diagram; add note or move legacy PRDs under tasks/archive/; sync names.

**[Version.ts generation and git state issues]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Issue: src/version.ts is committed (with stale "0.7.4" while package.json is "0.7.5"); AGENTS.md claims it is .gitignore'd (but .gitignore does not list it); two generation paths (build.sh using node -p, CI inline echo).
- Files: `src/version.ts`, `package.json`, `scripts/build.sh`, `.github/workflows/release.yml`, `AGENTS.md`, `.gitignore`
- Impact: `ai --version` lies in git tree or after pkg bump without rebuild; CI/local inconsistency.
- Fix approach: Add `src/version.ts` to .gitignore, ensure clean before commit, run build in CI consistently or generate at import time.

**[Dual build/version paths and script duplication]:**
- Issue: Local `bun run build` runs bash scripts/build.sh; release matrix generates version.ts then calls bun build directly (no script); justfile and package scripts are thin wrappers.
- Files: `scripts/build.sh`, `.github/workflows/release.yml`, `package.json`, `justfile`
- Impact: Changes to build must be duplicated or risk divergence; version gen fragile.
- Fix approach: Make build script the single source (support --target), call it from CI after version write, or move logic to TS.

**[Casts and Record<unknown> patterns for validation]:**
- Issue: Heavy use of `as Record<string, unknown>` + property checks and `as` casts in config/detect.
- Files: `src/config.ts`, `src/detect.ts`
- Impact: Runtime type errors possible if schema changes; boilerplate.
- Fix approach: Consider zod or valibot for runtime validation (adds dep) or keep but add more exhaustive test cases.

## Known Bugs

**[Windows tool detection completely broken]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Symptoms: `commandExists` (used by detectInstalledTools and gh check) unconditionally spawns `"which"`, which does not exist on Windows; tools present via PATH or in expected locations are never auto-detected.
- Files: `src/detect.ts`
- Trigger: Any run of `ai` (or direct) on Windows (or mingw without which); CI ubuntu masks it.
- Workaround: Manually add tools to config.json; `ai ccs:...` etc won't appear.

**[Committed stale VERSION and runtime version reporting]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Symptoms: Built-in version may be behind package.json after edits; running `bun run src/index.ts --version` reports the committed src/version.ts value.
- Files: `src/version.ts`, `package.json`
- Trigger: Edit package.json version or use source tree without rebuild.
- Workaround: Always `bun run build` before testing version.

**[Overly broad output path forbidden patterns (substring match)]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Symptoms: `isValidOutputPath` rejects any relative path containing substrings like "etc/", "home/", "usr/", ".git/" even deep inside safe dirs (e.g. "notes/home-review.md").
- Files: `src/index.ts`, `src/index.test.ts`
- Trigger: `--diff-output notes/home-foo.md` or similar.
- Workaround: Use names without the substrings.

**[Template build vs validate inconsistency on multiple $@]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Symptoms: `validateTemplate` (and thus loadConfig) rejects >1 $@ ; however `buildTemplateCommand` silently replaces only the first, leaving subsequent $@ in output.
- Files: `src/config.ts`, `src/template.ts`, `src/template.test.ts`
- Trigger: Direct calls or future bypasses hit it.
- Workaround: Avoid multiple $@ in templates.

**[TUI ESC/ arrow distinction is timing/racy]:**
- Symptoms: Bare ESC treated with setTimeout(..., 50) to let arrow seqs (ESC+[) arrive; can incorrectly treat arrows as cancel or require perceptible delay.
- Files: `src/fuzzy-select.ts`
- Trigger: Pressing arrows or ESC rapidly, high-latency terminal.
- Workaround: None.

**[Install script fragile unstructured parse of GitHub releases JSON]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Symptoms: `grep "browser_download_url.*${ARTIFACT}" | cut -d '"' -f4 | head -n1` on raw JSON text; will break on whitespace changes.
- Files: `install.sh`
- Trigger: New release or GitHub API tweak.
- Workaround: Prefer Homebrew or manual download.

**[Non-stdin prompt launch always uses "sh" -c even for Windows artifacts]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Symptoms: `launchToolWithPrompt` constructs `sh -c "cmd 'escaped'"` or spawn "sh"; Windows builds of the launcher will fail or behave differently.
- Files: `src/index.ts`, `.github/workflows/release.yml`
- Trigger: `ai --diff-staged` on Windows.
- Workaround: Run in WSL.

**[CCS profile parsing regex is table-format specific and brittle]:**
- Symptoms: `parseCcsApiList` relies on unicode box chars and exact `[OK]` column alignment.
- Files: `src/detect.ts`
- Trigger: ccs update or non-UTF8 locale.
- Workaround: Configure tools manually.

## Security Considerations

**[Core reliance on regex allowlist + limited dangerous blacklist + shell:true]:**
- Risk: Any bypass of `isSafeCommand` / `validateArguments` / `isValidGitRef` / `isValidOutputPath` results in arbitrary command execution via `spawnSync(..., {shell:true})`. 
- Files: `src/template.ts`, `src/index.ts`, `src/cli/diff.ts`
- Current mitigation: Length caps, explicit blocks for && || ; $( `, git ref no metachars, output path no .. / protected names.
- Recommendations: Move to argument-array spawning; maintain an explicit allowlist of base binaries.

**[Prompt injection surface in diff analysis and sh -c paths]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Risk: Git diff content (or --diff-prompt) is inserted into shell command string after only ' escaping.
- Files: `src/index.ts`, `src/cli/diff.ts`, `src/prompt-escaping.test.ts`
- Current mitigation: Single-quote wrapping + ' -> '\'' replace; git refs validated; diff comes from local git.
- Recommendations: Prefer `promptUseStdin: true` for all prompt tools; pass prompt via stdin/input to spawn.

**[Upgrade path fetches + executes arbitrary binaries from GitHub with only sha256]:**
- Risk: Compromised release, CDN, or MitM leads to code execution on `ai upgrade`; checksum verification is best-effort.
- Files: `src/upgrade.ts`, `install.sh`
- Current mitigation: Checksum from separate asset, sha256 verify, backup + atomic rename, platform allowlist.
- Recommendations: Add release signatures verification if GitHub supports; use streaming download + verify before write.

**[Unvalidated stdinContent passed to shell commands]:**
- Risk: `validateArguments` is not called on `stdinContent` when building the final command, which could allow shell metacharacters to be executed via `spawnSync`'s `shell: true` option.
- Files: `src/index.ts`
- Current mitigation: None for stdin.
- Recommendations: Apply validation to all user-controlled inputs before shell execution, or completely remove `shell: true`.

**[Full stdin slurped with no size limit for template input]:** ✅ RESOLVED in `fix/codebase-concerns` —
  kept for history;
- Risk: `cat huge.bin | ai template` or huge piped diff can OOM or cause slow/DoS on the launcher itself.
- Files: `src/index.ts`
- Current mitigation: Try/catch around readFileSync(0).
- Recommendations: Add size limit + early error.

## Performance Bottlenecks

**[Per-keystroke full fuzzy re-search + re-render in TUI]:**
- Problem: Every printable/backspace triggers new Fuse search over items + full clear+redraw.
- Files: `src/fuzzy-select.ts`
- Cause: No debounce, no incremental matching.
- Improvement path: Debounce 30-50ms on input; simple string filter first then fuse only on demand.

**[Detection spawns external processes on every single invocation]:**
- Problem: `ai` always runs detectInstalledTools which does multiple `which`, and if ccs present also `ccs api list` + gh check.
- Files: `src/index.ts`, `src/detect.ts`
- Cause: No in-process cache or persistent result.
- Improvement path: Memoize within process; optional fs cache.

**[Upgrade and install pull full binary (~50MB+) into memory before disk]:**
- Problem: High memory usage during upgrade.
- Files: `src/upgrade.ts`, `install.sh`
- Cause: Simple fetch + write pattern.
- Improvement path: Stream to temp file + verify on the fly where possible.

**[Git diff loads entire output (capped 10MB) into string]:**
- Problem: High memory usage for large diffs.
- Files: `src/git-diff.ts`
- Cause: Also full string passed into prompt template.
- Improvement path: Stream/chunk per file for analysis if needed.

## Fragile Areas

**[Custom raw-mode terminal UI with manual ANSI + key parsing]:**
- Files: `src/fuzzy-select.ts`
- Why fragile: Assumes ANSI everywhere, specific key sequences, stdout.columns snapshot never refreshed, 50ms ESC heuristic.
- Safe modification: Never edit without running in multiple terminals + tmux; wrap key handling.
- Test coverage gaps: `promptForInput` declared but not exercised; zero coverage of render, navigation, filtering, cleanup.

**[Ad-hoc string parsers and validators instead of structured]:**
- Files: `src/template.ts`, `src/cli/diff.ts`, `src/detect.ts`, `src/index.ts`
- Why fragile: Subtle escaping, \ vs /, unicode, quoting differences, future output changes from git/ccs.
- Safe modification: Add exhaustive unit + property tests; consider a small parser lib.
- Test coverage gaps: Need structured mock data.

**[Child process lifecycle and exit code handling]:**
- Files: `src/index.ts`
- Why fragile: Signals, windows codes, stdio inherit vs pipe, shell:true side effects.
- Safe modification: Centralize a launcher helper with proper error mapping; test exit paths.
- Test coverage gaps: Minimal testing of child exit combinations.

**[Upgrade atomic replace + permission recovery logic]:**
- Files: `src/upgrade.ts`
- Why fragile: Partial failure can leave .backup files or remove the binary; race with other upgrades.
- Safe modification: Use a dedicated updater lib or simpler "download to side, exec new to self-replace on next run".
- Test coverage gaps: Network, fs/promises operations, error recovery paths.

## Scaling Limits

**[TUI list size and visibility]:**
- Current capacity: maxVisible=10 hardcoded; works for the ~15-25 tools+templates most users have.
- Limit: when >>20 items the scroll/selection and "N more" UX degrade; render cost linear.
- Scaling path: Virtual scrolling or search-only (no list) mode.

**[Diff size hard cap]:**
- Current capacity: 10MB maxBuffer + 8MB warn.
- Limit: Large monorepo diffs, vendored code, or binary changes cause GitCommandError or truncated analysis.
- Scaling path: Per-file chunking + multiple AI calls, or user-specified --diff-paths filter.

**[Memory for full prompt/stdin/diff]:**
- Current capacity: All content turned into JS strings and passed to child or written.
- Limit: Multi-hundred MB diffs will OOM the launcher before the AI tool sees it.
- Scaling path: Size guards + streaming where tools support.

## Dependencies at Risk

**[fuse.js ^7.3.0]:**
- Risk: Core to all fuzzy selection and some lookup; only runtime dep besides semver. If major breaks or unmaintained, interactive is dead.
- Impact: High.
- Migration plan: Lightweight substitute (e.g. simple prefix + localeCompare + optional tiny levenshtein) since item count is tiny.

**[Bun runtime + --compile only]:**
- Risk: All execution and the distributed artifacts are Bun-specific. No tested pure-Node path.
- Impact: High for non-Bun users.
- Migration plan: N/A for now; document as Bun-only tool.

**[GitHub (releases API, raw downloads, homebrew tap) as single distribution channel]:**
- Risk: Outage, rate limit, or compromise affects all install/upgrade paths.
- Impact: High.
- Migration plan: Mirror releases; support multiple registries later.

## Missing Critical Features

**[No built-in way to manage/edit config]:**
- Problem: Adding tools/templates/aliases requires hand-editing JSON at `~/.config/ai-launcher/config.json`; no `ai add`, `ai config edit`, or guided flow.
- Blocks: New users, non-technical users, quick alias creation from CLI.

**[Incomplete Windows support (detection + prompt launch + TUI)]:**
- Problem: "which" hardcode, "sh" -c, raw mode ANSI expectations, documented limitations.
- Blocks: Full cross-platform promise in README and marketing.

**[No timeouts, cancellation, or progress for network operations in upgrade]:**
- Problem: `fetch` calls can hang forever on bad network.
- Blocks: Reliable `ai upgrade` in flaky environments.

## Test Coverage Gaps

**[Interactive TUI behavior (fuzzySelect full flow)]:**
- What's not tested: setRawMode, data listener, handleKey for all keys, updateFilter + fuse, moveUp/Down + scroll, render + ANSI + compact, clear, ESC timeout, promptForInput full interaction, resize behavior.
- Files: `src/fuzzy-select.ts`, `src/fuzzy-select.test.ts`
- Risk: Any change to keys, filtering, display, or terminal assumptions silently breaks the primary UX.
- Priority: High

**[Launch / execution paths]:**
- What's not tested: The actual spawnSync calls, shell construction, error paths, exit, full main() branches for direct/fuzzy/dash/diff/template+stdin cases, writeFileSync success/failure in diff output.
- Files: `src/index.ts`, `src/prompt-escaping.test.ts`, `src/index.test.ts`
- Risk: Injection vectors, platform spawn differences, file write errors, exit code bugs, $@ substitution errors go unnoticed.
- Priority: High

**[Upgrade end-to-end]:**
- What's not tested: Network, fs/promises operations, error recovery paths, actual binary locations.
- Files: `src/upgrade.ts`, `src/upgrade.test.ts`
- Risk: `ai upgrade` can leave system in broken state (missing binary, stray .backup); undetected on CI.
- Priority: High

**[Detection under varied conditions]:**
- What's not tested: Windows (always), mocked spawns, parse failures, timeout, ccs output variants, dedup edge cases.
- Files: `src/detect.ts`, `src/detect.test.ts`
- Risk: Silent loss of auto-detected tools, wrong ccs: profiles, gh-copilot never appears.
- Priority: Medium
