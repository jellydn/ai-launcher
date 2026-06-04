# Codebase Concerns

**Analysis Date:** 2026-06-04

## Tech Debt

**[Validation logic duplication in tests]:**
- Issue: Multiple test files duplicate and reimplement core validation functions (validateArguments, isValidOutputPath, validateToolCommand, substitute helpers) as local copies instead of importing the real implementations.
- Files: `src/index.test.ts:8`, `src/index.test.ts:193`, `src/index.test.ts:3`, `src/template.test.ts:183`, `src/template.test.ts:222`
- Impact: Logic drift risk between source security checks and tests; changes to patterns (e.g. safe chars) require dual edits; violates "test behavior" guideline in AGENTS.md.
- Fix approach: Extract pure validators to e.g. src/validators.ts (or export from modules), import in tests and source; remove copies.

**[Outdated and incomplete architecture documentation]:**
- Issue: AGENTS.md architecture section lists only 10 src files and is missing later additions (cli/diff.ts, errors.ts, git-diff.ts, prompts.ts); historical docs use legacy names "ai-router"/"ai-switcher" and outdated config paths ~/.config/ai-router and ~/.ccs/config.json (now uses `ccs api list`).
- Files: `AGENTS.md:107`, `AGENTS.md:118`, `tasks/prd-ai-cli-router.md:1`, `tasks/prd-ai-cli-router.md:101`, `scripts/ralph/progress.txt:8`, `scripts/ralph/progress.txt:11`, `scripts/ralph/progress.txt:47`
- Impact: Misleading for agents/humans; search hits on old names; incorrect mental model of modules.
- Fix approach: Update AGENTS.md file list + diagram; add note or move legacy PRDs under tasks/archive/; sync names.

**[Version.ts generation and git state issues]:**
- Issue: src/version.ts is committed (with stale "0.7.4" while package.json is "0.7.5"); AGENTS.md claims it is .gitignore'd (but .gitignore does not list it); two generation paths (build.sh using node -p, CI inline echo).
- Files: `src/version.ts:3`, `package.json:3`, `scripts/build.sh:3`, `.github/workflows/release.yml:54`, `AGENTS.md:118`, `.gitignore`
- Impact: `ai --version` lies in git tree or after pkg bump without rebuild; CI/local inconsistency.
- Fix approach: Add `src/version.ts` to .gitignore, ensure clean before commit, run build in CI consistently or generate at import time.

**[Dual build/version paths and script duplication]:**
- Issue: Local `bun run build` runs bash scripts/build.sh; release matrix generates version.ts then calls bun build directly (no script); justfile and package scripts are thin wrappers.
- Files: `scripts/build.sh:1`, `.github/workflows/release.yml:62`, `package.json:13`, `justfile:8`
- Impact: Changes to build must be duplicated or risk divergence; version gen fragile.
- Fix approach: Make build script the single source (support --target), call it from CI after version write, or move logic to TS.

**[Casts and Record<unknown> patterns for validation]:**
- Issue: Heavy use of `as Record<string, unknown>` + property checks and `as` casts in config/detect (required by strict + no any, but still manual).
- Files: `src/config.ts:94`, `src/config.ts:135`, `src/config.ts:187`, `src/detect.ts:127`, `src/detect.ts:164`
- Impact: Runtime type errors possible if schema changes; boilerplate.
- Fix approach: Consider zod or valibot for runtime validation (adds dep) or keep but add more exhaustive test cases.

## Known Bugs

**[Windows tool detection completely broken]:**
- Symptoms: `commandExists` (used by detectInstalledTools and gh check) unconditionally spawns `"which"`, which does not exist on Windows; tools present via PATH or in expected locations are never auto-detected (ccs/gh-copilot also affected).
- Files: `src/detect.ts:166`, `src/detect.ts:161`, `src/detect.ts:260`, `src/detect.ts:271`, `src/detect.ts:174`
- Trigger: Any run of `ai` (or direct) on Windows (or mingw without which); CI ubuntu masks it.
- Workaround: Manually add tools to config.json; `ai ccs:...` etc won't appear.

**[Committed stale VERSION and runtime version reporting]:**
- Symptoms: Built-in version may be behind package.json after edits; running `bun run src/index.ts --version` reports the committed src/version.ts value.
- Files: `src/version.ts:3`, `package.json:3`
- Trigger: Edit package.json version or use source tree without rebuild.
- Workaround: Always `bun run build` before testing version.

**[Overly broad output path forbidden patterns (substring match)]:**
- Symptoms: `isValidOutputPath` rejects any relative path containing substrings like "etc/", "home/", "usr/", ".git/" even deep inside safe dirs (e.g. "notes/home-review.md", "project/etc/config.md").
- Files: `src/index.ts:46`, `src/index.ts:59`, `src/index.ts:52`, `src/index.test.ts:204` (tests expect the broad behavior)
- Trigger: `--diff-output notes/home-foo.md` or similar.
- Workaround: Use names without the substrings.

**[Template build vs validate inconsistency on multiple $@]:**
- Symptoms: `validateTemplate` (and thus loadConfig) rejects >1 $@ ; however `buildTemplateCommand` (used in template.test and some execution) silently replaces only the first, leaving subsequent $@ in output.
- Files: `src/config.ts:155`, `src/template.ts:32`, `src/template.test.ts:307`
- Trigger: (Prevented at config load, but direct calls or future bypasses hit it.)

**[TUI ESC/ arrow distinction is timing/racy]:**
- Symptoms: Bare ESC treated with setTimeout(..., 50) to let arrow seqs (ESC+[) arrive; can incorrectly treat arrows as cancel or require perceptible delay.
- Files: `src/fuzzy-select.ts:235`, `src/fuzzy-select.ts:238`, `src/fuzzy-select.ts:35`
- Trigger: Pressing arrows or ESC rapidly, high-latency terminal, or certain term emulators.

**[Install script fragile unstructured parse of GitHub releases JSON]:**
- Symptoms: `grep "browser_download_url.*${ARTIFACT}" | cut -d '"' -f4 | head -n1` on raw JSON text; will break on whitespace changes, field reordering, or GitHub response evolution.
- Files: `install.sh:41`, `install.sh:42`
- Trigger: New release or GitHub API tweak.
- Workaround: Use the curl | sh at your own risk; prefer Homebrew or manual download.

**[Non-stdin prompt launch always uses "sh" -c even for Windows artifacts]:**
- Symptoms: `launchToolWithPrompt` (used by all --diff-*) constructs `sh -c "cmd 'escaped'"` or spawn "sh"; Windows builds of the launcher will fail or behave differently when using --diff-* or custom prompts.
- Files: `src/index.ts:240`, `src/index.ts:278`, `src/index.ts:206`, `.github/workflows/release.yml:29`
- Trigger: `ai --diff-staged` or `ai claude --diff-commit HEAD` on Windows.

**[CCS profile parsing regex is table-format specific and brittle]:**
- Symptoms: `parseCcsApiList` relies on unicode box chars and exact `[OK]` column alignment; changes in ccs "api list" output (widths, encoding, status text) silently drop profiles.
- Files: `src/detect.ts:210`, `src/detect.ts:204`
- Trigger: ccs update or non-UTF8 locale.

## Security Considerations

**[Core reliance on regex allowlist + limited dangerous blacklist + shell:true]:**
- Risk: Any bypass of `isSafeCommand` / `validateArguments` / `isValidGitRef` / `isValidOutputPath` results in arbitrary command execution via `spawnSync(..., {shell:true})`. Regexes are complex and have evolved (backticks partially allowed for prompts).
- Files: `src/template.ts:22` (isSafeCommand + SAFE_COMMAND_PATTERN + DANGEROUS_PATTERNS), `src/index.ts:149`, `src/index.ts:184`, `src/index.ts:200`, `src/index.ts:90` (validateArguments), `src/cli/diff.ts:32`, `src/index.ts:186`
- Current mitigation: Length caps (500/200), explicit blocks for && || ; $( `sudo rm -rf > / , config-time isSafe + single $@ checks, git ref no metachars, output path no .. / protected names.
- Recommendations: Move to argument-array spawning (use the existing parseTemplateCommand more widely); maintain an explicit allowlist of base binaries; add runtime sandbox notes or seccomp where possible; property-based/fuzz tests on validators.

**[Prompt injection surface in diff analysis and sh -c paths]:**
- Risk: Git diff content (or --diff-prompt) is inserted into shell command string after only ' escaping; large or specially crafted diffs could affect shell parsing or be interpreted by the target AI tool in unexpected ways.
- Files: `src/index.ts:237`, `src/index.ts:275`, `src/cli/diff.ts:154`, `src/prompt-escaping.test.ts:22`
- Current mitigation: Single-quote wrapping + ' -> '\'' replace; git refs validated; diff comes from local git (trusted in context).
- Recommendations: Prefer `promptUseStdin: true` for all prompt tools; pass prompt via stdin/input to spawn instead of command line; document the risk.

**[Upgrade path fetches + executes arbitrary binaries from GitHub with only sha256]:**
- Risk: Compromised release, CDN, or MitM (despite https) leads to code execution on `ai upgrade`; checksum verification is best-effort and after full download to tmp.
- Files: `src/upgrade.ts:87`, `src/upgrade.ts:118`, `src/upgrade.ts:127`, `install.sh:40`
- Current mitigation: Checksum from separate asset, sha256 verify, backup + atomic rename, platform allowlist.
- Recommendations: Add release signatures (cosign/minisign) verification if GitHub supports; use streaming download + verify before write; consider pinned release hashes in client.

**[User config can introduce powerful templates; validated only for syntax not intent]:**
- Risk: Templates with `ccs ... --permission-mode acceptEdits` or similar can perform destructive edits once launched; no sandbox around the child.
- Files: `src/config.ts:12` (DEFAULT_TEMPLATES), `src/config.ts:149` (validate uses isSafeCommand), `README.md:326`
- Current: Only syntactic safety.
- Recommendations: Document prominently; consider a --dry or audit log of launched commands.

**[Full stdin slurped with no size limit for template input]:**
- Risk: `cat huge.bin | ai template` or huge piped diff can OOM or cause slow/DoS on the launcher itself before even reaching the child.
- Files: `src/index.ts:98`, `src/index.ts:304`
- Current: Try/catch around readFileSync(0).
- Recommendations: Add size limit + early error (similar to git-diff 10MB cap).

## Performance Bottlenecks

**[Per-keystroke full fuzzy re-search + re-render in TUI]:**
- Problem: Every printable/backspace triggers new Fuse search over items + full clear+redraw of up to 10+ lines.
- Files: `src/fuzzy-select.ts:269`, `src/fuzzy-select.ts:273`, `src/fuzzy-select.ts:265`
- Cause: No debounce, no incremental matching, render always rebuilds ANSI strings and queries stdout.columns.
- Improvement path: Debounce 30-50ms on input; since N is tiny (typically <30), simple string filter first then fuse only on demand; cache filtered.

**[Detection spawns external processes on every single invocation]:**
- Problem: `ai` (interactive or direct) always runs detectInstalledTools which does multiple `which`, and if ccs present also `ccs api list` + gh check (with 3s timeouts).
- Files: `src/index.ts:307`, `src/detect.ts:255`, `src/detect.ts:166`, `src/detect.ts:221`, `src/detect.ts:179`
- Cause: No in-process cache or persistent result.
- Improvement path: Memoize within process; optional fs cache (~/.cache/ai-launcher/detected.json with mtime or ttl).

**[Upgrade and install pull full binary (~50MB+) into memory before disk]:**
- Files: `src/upgrade.ts:124` (arrayBuffer), `install.sh:55`
- Cause: Simple fetch + write pattern.
- Improvement path: Stream to temp file + verify on the fly where possible.

**[Git diff loads entire output (capped 10MB) into string]:**
- Files: `src/git-diff.ts:15`, `src/git-diff.ts:57`
- Also full string passed into prompt template.
- Improvement: Stream/chunk per file for analysis if needed.

## Fragile Areas

**[Custom raw-mode terminal UI with manual ANSI + key parsing]:**
- Files: `src/fuzzy-select.ts:85` (fuzzySelect), `src/fuzzy-select.ts:113` (setRawMode(true)), `src/fuzzy-select.ts:228` (handleKey), `src/fuzzy-select.ts:182` (clear), `src/fuzzy-select.ts:39` (getTerminalWidth, cached only), `src/fuzzy-select.ts:64` (CSI codes)
- Why fragile: Assumes ANSI everywhere, specific key sequences, stdout.columns snapshot never refreshed, 50ms ESC heuristic, manual line counting for clear, no handling of paste, SIGWINCH, focus events, or non-UTF8; Windows Terminal vs others differ.
- Safe modification: Never edit without running in multiple terminals + tmux; wrap key handling; add resize listener that forces re-render.
- Test coverage: `src/fuzzy-select.test.ts:85` only checks exports and toSelectableItems; `promptForInput` declared but not exercised; zero coverage of render, navigation, filtering, cleanup.

**[Ad-hoc string parsers and validators instead of structured]:**
- Files: `src/template.ts:41` (parseTemplateCommand quote state machine), `src/cli/diff.ts:32` (isValidGitRef), `src/detect.ts:204` (parseCcsApiList), `src/index.ts:31` (isValidOutputPath + normalize + many regex), `src/index.ts:177` (split(/\s+/) after sub)
- Why fragile: Subtle escaping, \ vs /, unicode, quoting differences, future output changes from git/ccs.
- Safe modification: Add exhaustive unit + property tests; consider a small parser lib or keep simple with heavy tests.

**[Child process lifecycle and exit code handling]:**
- Files: `src/index.ts:22` (handleChildProcessError), `src/index.ts:184` (spawn), `src/index.ts:189`, many `process.exit(child.status ?? ...)` throughout index and cli/diff.
- Why fragile: Signals, windows codes, stdio inherit vs pipe, shell:true side effects, concurrent? (none).
- Safe: Centralize a launcher helper with proper error mapping; test exit paths.

**[Upgrade atomic replace + permission recovery logic]:**
- Files: `src/upgrade.ts:181` (try rename backup, needsRestore flag, EACCES special case, multiple unlinks)
- Why fragile: Partial failure can leave .backup files or remove the binary; race with other upgrades or the running process.
- Safe: Use a dedicated updater lib or simpler "download to side, exec new to self-replace on next run".

**[GitHub Actions release matrix + secret-dependent homebrew push]:**
- Files: `.github/workflows/release.yml:14` (matrix), `.github/workflows/release.yml:167` (HOMEBREW_TAP_TOKEN), version workflow concurrency.
- Fragile to token rotation, tag format, artifact download v8 vs upload v7 mismatch in same file.

## Scaling Limits

**[TUI list size and visibility]:**
- Current capacity: maxVisible=10 hardcoded; works for the ~15-25 tools+templates most users have.
- Limit: `src/fuzzy-select.ts:102`; when >>20 items the scroll/selection and "N more" UX degrade; render cost linear.
- Scaling path: Virtual scrolling or search-only (no list) mode; not needed for current use case.

**[Diff size hard cap]:**
- Current: 10MB maxBuffer + 8MB warn `src/git-diff.ts:15`
- Limit: Large monorepo diffs, vendored code, or binary changes cause GitCommandError or truncated analysis.
- Scaling path: Per-file chunking + multiple AI calls, or user-specified --diff-paths filter.

**[Memory for full prompt/stdin/diff]:**
- All content turned into JS strings and passed to child or written.
- Limit: Multi-hundred MB diffs will OOM the launcher before the AI tool sees it.
- Scaling path: Size guards + streaming where tools support.

**[Single-user local FS config + no concurrency control]:**
- Fine for CLI launcher.

## Dependencies at Risk

**[fuse.js ^7.3.0]:**
- Risk: Core to all fuzzy selection and some lookup; only runtime dep besides semver. If major breaks or unmaintained, interactive is dead.
- Impact: `src/fuzzy-select.ts:92`, `src/lookup.ts:37` and lookup ambiguity scoring.
- Migration plan: Lightweight substitute (e.g. simple prefix + localeCompare + optional tiny levenshtein) since item count is tiny; or pin + vendor if needed.

**[semver ^7.7.4]:**
- Risk: Only used for VERSION >= latestVersion in upgrade.
- Impact: Low; standard and stable.
- Migration plan: Simple string compare or remove (GitHub tags are v-prefixed semver anyway).

**[Bun runtime + --compile only]:**
- Risk: All execution (shebang, test, build) and the distributed artifacts are Bun-specific. No tested pure-Node path.
- Files: `package.json:5`, `src/index.ts:1`, `.github/workflows/*.yml`
- Migration plan: N/A for now; document as Bun-only tool.

**[GitHub (releases API, raw downloads, homebrew tap) as single distribution channel]:**
- Risk: Outage, rate limit, or compromise affects all install/upgrade paths (curl, brew, `ai upgrade`).
- Impact: `src/upgrade.ts:9`, `install.sh:39`, HomebrewFormula, release workflow.
- Migration plan: Mirror releases; support multiple registries later.

**[Renovate + biome pinned but transitive]:**
- Low risk; small dep tree visible in bun.lock.

## Missing Critical Features

**[No built-in way to manage/edit config]:**
- Problem: Adding tools/templates/aliases requires hand-editing JSON at `~/.config/ai-launcher/config.json`; no `ai add`, `ai config edit`, or guided flow.
- Blocks: New users, non-technical users, quick alias creation from CLI.
- Files: `src/config.ts:248`, README long manual examples.

**[Incomplete Windows support (detection + prompt launch + TUI):**
- Problem: "which" hardcode, "sh" -c, raw mode ANSI expectations, documented limitations.
- Blocks: Full cross-platform promise in README and marketing.
- Files: `src/detect.ts:166`, `src/index.ts:240`, README:727

**[No timeouts, cancellation, or progress for network operations in upgrade]:**
- Problem: `fetch` calls can hang forever on bad network.
- Blocks: Reliable `ai upgrade` in flaky environments.
- Files: `src/upgrade.ts:87`, `src/upgrade.ts:118`

**[No integration / end-to-end tests for launch flows]:**
- (See Test Gaps)

**[No observability / audit of launched commands (for security review)].**

## Test Coverage Gaps

**[Interactive TUI behavior (fuzzySelect full flow)]:**
- What's not tested: setRawMode, data listener, handleKey for all keys, updateFilter + fuse, moveUp/Down + scroll, render + ANSI + compact, clear, ESC timeout, promptForInput full interaction, resize behavior.
- Files: `src/fuzzy-select.ts:85`, `src/fuzzy-select.test.ts:85` (only `toSelectableItems` + typeof check)
- Risk: Any change to keys, filtering, display, or terminal assumptions silently breaks the primary UX; hard to catch without manual testing.
- Priority: High

**[Launch / execution paths (launchTool, launchToolWithPrompt, template expansion in context, stdin, output files, status codes)]:**
- What's not tested: The actual spawnSync calls, shell construction, error paths, exit, full main() branches for direct/fuzzy/dash/diff/template+stdin cases, writeFileSync success/failure in diff output.
- Files: `src/index.ts:148`, `src/index.ts:194`, `src/prompt-escaping.test.ts:4` (only the replace logic), `src/index.test.ts` (parses + isolated validators only)
- Risk: Injection vectors, platform spawn differences, file write errors, exit code bugs, $@ substitution errors go unnoticed until prod use.
- Priority: High

**[Upgrade end-to-end (findBinaryPath, fetch, checksum, rename/backup/restore, permission cases, platform paths)]:**
- What's not tested: Network, fs/promises operations, error recovery paths, actual binary locations.
- Files: `src/upgrade.ts:69`, `src/upgrade.test.ts:3` (only artifact name, checksum parse, platform checks)
- Risk: `ai upgrade` can leave system in broken state (missing binary, stray .backup); undetected on CI.
- Priority: High

**[Detection (commandExists, ccs profile parse, gh copilot, merge) under varied conditions]:**
- What's not tested: Windows (always), mocked spawns, parse failures, timeout, ccs output variants, dedup edge cases.
- Files: `src/detect.ts:161`, `src/detect.test.ts:245` (calls real detectInstalledTools and asserts provenance)
- Risk: Silent loss of auto-detected tools, wrong ccs: profiles, gh-copilot never appears.
- Priority: Medium

**[Config I/O and load (migrateOldConfig, createDefault, bad JSON, validation error formatting)]:**
- What's not tested: File system side effects, migration success/failure, JSON syntax error vs validation error UX.
- Files: `src/config.ts:228`, `src/config.ts:243`, `src/config.ts:248`, `src/config.test.ts` (validateTemplate only)
- Risk: First-run failures, corrupted user config, poor error messages.
- Priority: Medium

**[Git diff + executeDiffCommand integration (real git states, prompt build, launchToolWithPrompt call, output file write)]:**
- What's not tested deeply: execute path, useStdin branches, outputFile dir checks + write, various error classes.
- Files: `src/cli/diff.ts:106`, `src/cli/diff.test.ts` (mostly parseDiffArgs + isValidGitRef), `src/git-diff.test.ts` (real git, limited states)
- Risk: --diff-* feature silently fails or writes wrong files.
- Priority: Medium

**[Platform-specific branches, large input handling, full main error paths, ambiguity candidates]:**
- Priority: Low/Medium (some unit coverage exists but not cross-platform).

---

*Concerns audit: 2026-06-04*
