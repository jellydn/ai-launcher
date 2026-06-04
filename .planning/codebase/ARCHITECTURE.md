# Architecture

**Analysis Date:** 2026-06-04

## Pattern Overview

**Overall:** Modular procedural CLI with focused pure and side-effect modules, strict TypeScript, security guards before execution, and co-located tests. No heavy frameworks or classes beyond error types.

**Key Characteristics:**
- Single async main() entry that dispatches on argv patterns (direct name, -- sep, no arg fuzzy, special --diff-*, upgrade) before heavy work where possible. `src/index.ts:287`
- Data transformed through pipeline: raw config/detect -> merged tools -> SelectableItem[] -> lookup or fuzzy -> launch
- Security by construction: allowlist + deny patterns for commands, validated refs/paths/args, no eval, shell only for final controlled spawn
- Detection merges user config (precedence) with runtime PATH checks and special subproc probes (ccs api list)
- Interactive TUI uses raw stdin/stdout ANSI without external UI libs; fuzzy uses fuse.js + custom pre-filters
- Build produces standalone via bun --compile; version injected at build
- Follows AGENTS.md guidelines: guard clauses, explicit returns, no any, node: prefix, verbatim type imports, small reversible steps

## Layers

**CLI Orchestration / Entry Layer:**
- Purpose: Argument parsing, flow control, stdio handling (incl stdin capture for templates), process spawning for tools, error exits, special modes (help, version, upgrade, diff)
- Location: `src/index.ts` (main orchestration and launch*), `src/cli/diff.ts` (diff specific parse/execute)
- Contains: main(), launchTool, launchToolWithPrompt, handleChildProcessError, validate* helpers, showHelp, readStdin, isValidOutputPath etc.
- Depends on: all lower layers (config, detect, fuzzy, lookup, template, cli/diff, upgrade, logo, version)
- Used by: shell invocation of the `ai` bin

**Configuration / Persistence Layer:**
- Purpose: Filesystem config load (with migrate from legacy ai-switcher), validation, default creation with rich templates
- Location: `src/config.ts`
- Contains: loadConfig, validateConfig, validateTemplate, validateTool, formatValidationErrors, ensureConfigDir, createDefaultConfig, migrateOldConfig, DEFAULT_CONFIG, CONFIG_PATH consts
- Depends on: `src/template.ts` (isSafeCommand), `src/types.ts`, node:fs, node:os, node:path
- Used by: `src/index.ts:306`, template tests via validateConfig

**Detection Layer:**
- Purpose: Runtime discovery of AI CLIs via PATH (which), special CCS profile extraction, gh-copilot probe, proxy profiles; merge with user config (dedup, precedence)
- Location: `src/detect.ts`
- Contains: KNOWN_TOOLS (15+ entries with optional promptCommand/promptUseStdin/execCommand), detectInstalledTools, mergeTools, detectCcsProfiles, parseCcsApiList, detectGhCopilot, detectCliProxyProfiles, formatSuggestedInstallHints, commandExists
- Depends on: node:child_process (spawnSync for which + ccs api + gh), `src/types.ts`
- Used by: `src/index.ts:307`

**Lookup + Fuzzy Selection Layer:**
- Purpose: Name/alias/fuzzy resolution (exact > alias > suffix > substring > fuse) with ambiguity scoring; full interactive raw-mode TUI with live fuse filter, key nav, compact mode, [T] template indicator
- Location: `src/lookup.ts`, `src/fuzzy-select.ts`
- Contains: findToolByName (returns LookupResult), fuzzySelect, promptForInput, toSelectableItems
- Depends on: fuse.js (two instances: lookup keys:["name"], fuzzy keys:["name","description","aliases"]), `src/types.ts`
- Used by: `src/index.ts:339`, `src/index.ts:355`, `src/cli/diff.ts:165`, `src/cli/diff.ts:181`, tests

**Template Safety / Execution Layer:**
- Purpose: Command sanitization (prevent injection), template expansion ($@ handling), shell parsing helper
- Location: `src/template.ts`
- Contains: isSafeCommand (SAFE_COMMAND_PATTERN allow + DANGEROUS_PATTERNS deny list incl && || ; $( ` sudo rm >), buildTemplateCommand, parseTemplateCommand (quote-aware split)
- Depends on: none (pure)
- Used by: `src/config.ts:149` (validate), `src/index.ts:149` (launch), `src/index.ts:200`, tests (dynamic import)

**Diff / Prompt / Git Layer:**
- Purpose: Git repo/diff extraction (staged or ref), analysis prompt construction, output file validation+write, launch via promptCommand or stdin pipe
- Location: `src/git-diff.ts`, `src/prompts.ts`, `src/errors.ts`, `src/cli/diff.ts`
- Contains: getGitDiff (with buffer limits), ensureGitRepository/isGitRepository, buildDiffAnalysisPrompt, GitDiffError + subclasses (NotGitRepositoryError etc), FileOutputError, parseDiffArgs, executeDiffCommand, isValidGitRef
- Depends on: node:child_process, `src/errors.ts`, `src/git-diff.ts`, `src/prompts.ts`, `src/lookup.ts`, `src/fuzzy-select.ts` (type), types
- Used by: `src/index.ts:323` (parse + execute if --diff-*)

**Self-Upgrade Layer:**
- Purpose: Cross-platform binary self-update from GitHub releases (fetch, checksum sha256, atomic rename with backup, permission handling)
- Location: `src/upgrade.ts`
- Contains: upgrade (async), findBinaryPath (which + common paths + execPath), platform/arch artifact logic
- Depends on: node:child_process (execSync), node:fs/promises, node:crypto, node:os, node:path, semver (gte), `src/version.ts`
- Used by: `src/index.ts:299` (early, before config)

**Supporting / Types Layer:**
- Purpose: Shared data shapes, branding, build-time version
- Location: `src/types.ts`, `src/logo.ts`, `src/version.ts`
- Contains: Tool, Template, Config, SelectableItem, AuthType, ConfigValidationError, LookupResult, SelectionResult, logo variants + getColoredLogo, VERSION const
- version generated: `scripts/build.sh:4` (from package.json), also in release CI; biome ignores `biome.json:63`
- Depends: semver only in upgrade

## Data Flow

**Primary Non-Diff Flow (`src/index.ts:287`):**
1. argv = process.argv.slice(2)
2. Early exits: --help/-h, --version/-v, "upgrade" (await upgrade)
3. stdinContent = readStdin() (only if !tty)
4. config = loadConfig()  // may migrate/create/throw validation
5. detectedTools = detectInstalledTools()
6. allTools = mergeTools(config.tools, detectedTools)  // user config wins, dedup name+command
7. items = toSelectableItems(allTools, config.templates)  // tools first then templates
8. lookupItems = items
9. if no items: print hints + exit
10. Parse for --diff-* (separate branch)
11. Handle "--" separator: beforeDash empty? -> fuzzySelect then launch(after); else lookup(before) then launch(after)
12. args.length >0 ? lookup(args[0]) + launch(slice(1)) : fuzzySelect() then (if template+$@ prompt input else launch)
13. launchTool always: isSafe + validateArgs + ($@ replace or append) + split + spawnSync(shell) + handle error + exit(status)

**Diff Flow (`src/index.ts:323`, `src/cli/diff.ts:106`):**
- parseDiffArgs -> options + flagIndex
- ensureGitRepository (or user msg)
- diff = getGitDiff (staged or ref; throws specific)
- prompt = buildDiffAnalysisPrompt(diff, ref, custom)
- if argsBeforeFlag empty: fuzzy -> item; else lookup(item)
- toolCmd = item.promptCommand ?? item.command; useStdin = ...
- launchToolWithPrompt(toolCmd, prompt, useStdin, outputFile?)  // which may pipe input or sh -c 'cmd '\''escaped'\'' , then if outputFile write stdout + exit

**Config Load Flow (`src/config.ts:248`):**
migrateOldConfig (copy if old exists new absent) -> if !exists createDefault (with 8 DEFAULT_TEMPLATES) -> read/parse -> validateConfig (tools+templates, isSafe, alias array, single $@ etc) -> throw formatted or return

**Lookup Heuristics (in order, `src/lookup.ts:11`):**
exact name (ci) -> alias (ci) -> unique suffix (e.g. "mm" -> "ccs:mm") -> unique substring -> fuse (threshold 0.4); if >=2 results check score gap <0.05 for ambiguous (list candidates) else best if score ok.

**State:** Ephemeral only. No in-memory cache beyond width cache in fuzzy. Config read once per run. TTY raw mode only during fuzzy/prompt, restored on exit/cancel.

**Spawn Points:** launchTool (inherit), launchToolWithPrompt (pipe or sh -c for prompt; optional fs write for --diff-output after validate no-abs no-.. no-protected).

## Key Abstractions

**SelectableItem (`src/types.ts:30`):**
- Purpose: Common representation for both Tool and Template enabling uniform fuzzy/lookup/launch/diff paths
- Examples: produced by `src/fuzzy-select.ts:9` (toSelectableItems), consumed everywhere
- Pattern: Structural adapter / discriminated by isTemplate bool + optional prompt* fields

**Tool (`src/types.ts:3`) / Template (`src/types.ts:13`):**
- Purpose: User or detected AI invocation spec; templates support $@ placeholder
- Persisted in `~/.config/ai-launcher/config.json` (validated on load)
- Optional fields for diff: promptCommand, promptUseStdin (to choose how to send analysis prompt)

**LookupResult (`src/lookup.ts:4`):**
- Purpose: Either success+item or failure+error (+optional candidates for ambiguity UI)
- Pattern: Result type (no throw for lookup)

**Git* Errors (`src/errors.ts`):**
- Hierarchy: GitDiffError base, NotGitRepositoryError, InvalidGitRefError, NoChangesError, GitCommandError, plus FileOutputError
- Used for typed catch in diff execute `src/cli/diff.ts:119`

**Safety Guard `isSafeCommand` (`src/template.ts:22`):**
- Central allow/deny used for both runtime launch and config acceptance

## Entry Points

**Runtime Binary:**
- Location: `package.json:8` ("bin": {"ai": "./dist/ai"}), produced by `bun build src/index.ts --compile` (local: `scripts/build.sh:9`; CI matrix: `.github/workflows/release.yml:63`)
- Triggers: any `ai` in PATH, `bun run src/index.ts ...`
- Responsibilities: shebang `#!/usr/bin/env bun`, runs main().catch

**Development:**
- `bun run dev` (package.json:12) executes src/index.ts directly
- justfile mirrors (just dev, build, etc.)

**CI / Checks:**
- `.github/workflows/ci.yml:19`: bun install, check (biome), typecheck, test (no build)
- Pre-commit: scripts/pre-commit (biome --staged), prek.toml (typecheck + biome on .ts)

**Release / Build:**
- Tag push triggers `.github/workflows/release.yml`: version gen, cross-compile matrix (bun-linux/mac/win targets), checksums, gh-release with artifacts + install notes, then homebrew tap update
- `scripts/build.sh`: also gens version.ts then compile (for local/manual)

**Upgrade:**
- `ai upgrade` early path `src/index.ts:299` before any config/detect

**Installers:**
- `install.sh`: standalone curl sh that downloads matching artifact + checksum (similar logic to upgrade)
- Homebrew: `HomebrewFormula/ai.rb` downloads per-arch and installs as "ai"

## Error Handling

**Strategy:** Explicit process.exit with small set of codes; user-friendly console.error; never let unhandled reach top except main catcher. Specific typed errors only for git-diff domain.

**Patterns:**
- Guard clauses at top of funcs (null/empty/unsafe -> early exit or error result) e.g. `src/index.ts:149`, `src/lookup.ts:12`
- Validation at boundaries: config load throws, launch pre-checks exit(1), parseDiff throws GitDiffError
- Spawn result check: handleChildProcessError looks for .error or .signal
- Diff: try/catch specific subclasses -> print guidance + process.exit(1); rethrow others
- main: `main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); })` `src/index.ts:402`
- Defined codes: SUCCESS=0, VALIDATION=1, FILE_WRITE=2, PROCESS=3 `src/index.ts:17`
- Upgrade and fetch paths have broad try/catch -> error msg + exit(1); cleanup on failure (restore backup)

## Cross-Cutting Concerns

**Logging / Output:** Pure console: log for progress ("Running: ", "Analyzing...", success save msg); error for failures/hints. No structured logs or levels. Colored only via logo and inline CSI in fuzzy-select.

**Validation:** Defense in depth
- Command: isSafeCommand (template + config), simpler regex in validateTool
- Args: validateArguments (safe charset + len<=200)
- Git ref: isValidGitRef (charset + no leading- + no .. + no metachars)
- Output path: isValidOutputPath (relative, no .., no leading ., no protected dirs like .git /etc /root etc) + exists check
- Config schema + semantics on every load
- Prompt count: at most one $@ , not starting with it

**Security:**
- Allowlist over denylist primary
- No user input directly to shell without escaping (only ' -> '\'' for prompts in sh -c)
- Templates validated same as runtime
- Stdin only read when !isTTY (pipes)
- Output writes only after dir exists + path safe
- Upgrade uses checksums when present

**Auth / External:** None handled internally; metadata (authType, prompt*) passed through for consumer CLIs (claude plan mode etc). CCS profiles carry authType.

**Testing Strategy:** bun:test, test behavior not impl; co-located *.test.ts; extract pure helpers for unit (e.g. validate fns, parse, substitute mocks); run real detect/isGit in tests (accept env); cover security cases, ambiguity, edge parses extensively.

**Performance / Env:** Bun for fast startup/TS exec/compile; small dep set (fuse, semver); tty width cache; buffer limits on diff (10MB); fuse threshold tuned.

**Extensibility Notes:** Add to KNOWN_TOOLS for auto-detect; user tools/templates in config.json override; new --diff- or modes via argv in index + cli/ subdir; prompt* fields per-tool for stdin vs arg prompt delivery.

---

*Architecture analysis: 2026-06-04*
