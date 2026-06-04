# Codebase Structure

**Analysis Date:** 2026-06-04

## Directory Layout

```
ai-launcher/
├── .changeset/                  # Changeset files for version bumps (e.g. add-freebuff-tool.md)
├── .claude/                     # Claude-specific config/hooks (see .claude/hooks/)
├── .github/                     # GitHub configuration
│   └── workflows/               # CI/release automation
│       ├── ci.yml
│       ├── release.yml
│       ├── sync-readme.yml
│       └── version.yml
├── .planning/                   # Planning artifacts (dot-dir)
│   └── codebase/                # Codemap outputs (ARCHITECTURE.md, STRUCTURE.md, others)
├── dist/                        # Build output (standalone executable; generated)
│   └── ai
├── docs/                        # GitHub Pages / docs site
│   ├── _README.md               # Synced copy of README.md
│   ├── CNAME
│   ├── index.html
│   ├── logo-icon.svg
│   ├── logo.svg
│   └── README.md
├── HomebrewFormula/             # Homebrew tap formula
│   └── ai.rb
├── node_modules/                # Installed deps (bun + dev)
├── scripts/                     # Dev / build / hook scripts
│   ├── build.sh                 # Generates version.ts + bun --compile
│   ├── pre-commit               # Biome check on staged (used by setup)
│   ├── ralph/                   # Internal ralph automation (prd, prompt, progress)
│   ├── setup-hooks.sh           # Installs git hooks
│   └── sync-readme.sh
├── src/                         # All application TypeScript source (strict, path alias @/*)
│   ├── cli/                     # CLI subcommand modules
│   │   ├── diff.test.ts
│   │   └── diff.ts
│   ├── config.test.ts
│   ├── config.ts
│   ├── detect.test.ts
│   ├── detect.ts
│   ├── errors.ts
│   ├── fuzzy-select.test.ts
│   ├── fuzzy-select.ts
│   ├── git-diff.test.ts
│   ├── git-diff.ts
│   ├── index.test.ts
│   ├── index.ts
│   ├── logo.ts
│   ├── lookup.test.ts
│   ├── lookup.ts
│   ├── prompt-escaping.test.ts
│   ├── prompts.ts
│   ├── template.test.ts
│   ├── template.ts
│   ├── types.ts
│   ├── upgrade.test.ts
│   ├── upgrade.ts
│   └── version.ts               # Generated at build time (see biome override + .gitignore intent)
├── tasks/                       # Historical PRD / task docs
│   ├── prd-ai-cli-router.md
│   └── prd-ci-cd-release.md
├── AGENTS.md                    # Agent guidelines (required reading)
├── biome.json                   # Formatter/linter config (2-space, 100-col, double quotes, strict rules)
├── bun.lock
├── CLAUDE.md                    # Points to AGENTS.md
├── example-config.json          # Example user config with tools + templates
├── install.sh                   # One-line curl installer (POSIX)
├── justfile                     # just dev/build/test shortcuts (mirrors package scripts)
├── package.json                 # name:ai-launcher, bin:ai->dist/ai, scripts, deps (fuse.js, semver)
├── prek.toml                    # prek git hook config (typecheck + biome)
├── renovate.json
├── tsconfig.json                # Strict TS, verbatimModuleSyntax, @/* -> src/*, rootDir src
└── README.md                    # Full user docs + examples
```

## Directory Purposes

**src/:**
- Purpose: Entire application implementation. Single source of truth for logic.
- Contains: All .ts modules + co-located Bun tests (* .test.ts). No subdirs except src/cli/
- Key files: `src/index.ts` (entry), `src/types.ts`, `src/config.ts`, `src/detect.ts`, `src/lookup.ts`, `src/fuzzy-select.ts`, `src/template.ts`, `src/cli/diff.ts`, `src/git-diff.ts`, `src/upgrade.ts`

**src/cli/:**
- Purpose: Grouped modules for specific CLI sub-features (currently diff analysis).
- Contains: diff.ts + diff.test.ts (parse/execute --diff-staged/--diff-commit etc)
- Used by: imported only from `src/index.ts`

**scripts/:**
- Purpose: Build, install hooks, sync, and internal tooling.
- Contains: build.sh (version gen + compile), setup-hooks.sh, sync-readme.sh, pre-commit, ralph/ subdir (ignored for core arch)
- Key: `scripts/build.sh:4` (overwrites src/version.ts)

**.github/workflows/:**
- Purpose: Automated CI, releases, versioning, docs sync.
- Contains: ci.yml (typecheck+check+test), release.yml (matrix compile + gh release + homebrew), version.yml (bumpp on main), sync-readme.yml
- Triggers builds and produces dist artifacts for all platforms

**docs/:**
- Purpose: GitHub Pages site content + logo assets. README synced to _README.md on main pushes.
- Contains: static html, svgs, CNAME, synced docs/_README.md

**HomebrewFormula/:**
- Purpose: Formula for `brew install jellydn/tap/ai`
- Key file: `HomebrewFormula/ai.rb` (per-arch download + bin install as "ai")

**tasks/:**
- Purpose: Historical product requirement docs (not active source)

**.changeset/:**
- Purpose: Changeset entries driving releases (e.g. minor for new tool)

**.planning/ (dot):**
- Purpose: Scratch / planning outputs (including this codemap under codebase/)

**dist/:**
- Purpose: Compiled standalone binary output of `bun build --compile`
- Generated: yes (by build or CI); present after local `bun run build`

## Key File Locations

**Entry Points:**
- `src/index.ts`: Primary runtime entrypoint (shebang + main). Handles all arg flows, launches, orchestration. `package.json:5` ("module"), `package.json:12` (dev script)
- `package.json:8`: Defines "bin" mapping "ai" -> "./dist/ai"
- `scripts/build.sh`: Local build entry (also gens version)
- `.github/workflows/release.yml:62`: CI build entry (direct bun build, version gen)

**Configuration:**
- `src/config.ts`: Load/validate/create logic + DEFAULT_TEMPLATES + CONFIG_PATH (`~/.config/ai-launcher/config.json`)
- `biome.json`: Linting/formatting rules + override to disable on src/version.ts
- `tsconfig.json`: Strict compiler, paths, include src/**/*.ts
- `example-config.json`: Sample with tools[] + templates[] (for docs)
- `package.json`: version (0.7.5), scripts (ci, build, typecheck, check, test etc), deps

**Core Logic:**
- `src/detect.ts`: KNOWN_TOOLS list + detection/merge
- `src/lookup.ts`: findToolByName + fuse heuristics + ambiguity
- `src/fuzzy-select.ts`: full TUI (raw mode, render, keys, fuse filter)
- `src/template.ts`: isSafeCommand, build/parse for $@
- `src/cli/diff.ts`: parseDiffArgs + executeDiffCommand
- `src/git-diff.ts`: getGitDiff + repo check (buffered)
- `src/upgrade.ts`: upgrade flow + findBinaryPath
- `src/prompts.ts`: buildDiffAnalysisPrompt
- `src/errors.ts`: GitDiffError hierarchy
- `src/logo.ts`: ascii + colors
- `src/types.ts`: Tool, Template, Config, SelectableItem etc.

**Testing:**
- All tests co-located: `src/<module>.test.ts` (e.g. `src/lookup.test.ts` exhaustive on findToolByName cases, `src/template.test.ts` via validate + dynamic imports)
- `src/index.test.ts`: extracted validation + parse logic tests
- `bun test` or `bun test src/config.test.ts` (per AGENTS.md)

**Build / Install / Release:**
- `install.sh`: curl installer (artifact download + checksum + PATH hint)
- `justfile`: task runner aliases for all package scripts
- `HomebrewFormula/ai.rb`: brew formula
- `.github/workflows/release.yml`: full release matrix + gh-release + homebrew update
- `scripts/sync-readme.sh`, `scripts/setup-hooks.sh`

**Other:**
- `AGENTS.md`: Project coding rules (strict TS, biome, patterns, workflow: typecheck -> check -> test -> build)
- `README.md`: User-facing (features, config schema, templates, security, platform notes)
- `src/version.ts`: Overwritten at build (contains export const VERSION)
- `renovate.json`, `prek.toml`, `bun.lock`

## Naming Conventions

**Files:**
- Kebab-case for modules per AGENTS.md: `fuzzy-select.ts`, `git-diff.ts`, `prompt-escaping.test.ts`
- Co-located tests: `<name>.test.ts` (bun:test)
- Config / data: kebab or descriptive (example-config.json, biome.json, tsconfig.json)
- Scripts: descriptive-kebab.sh (build.sh, sync-readme.sh)
- Generated: version.ts (explicitly marked in header comment)

**Directories:**
- Lowercase: src/, src/cli/, scripts/, docs/, tasks/, .github/
- Dot-dirs for tooling: .changeset/, .github/, .planning/, .claude/
- Feature grouping only when >1 file (cli/ for diff subcommand)

**Code (per AGENTS.md + observed):**
- Interfaces / types: PascalCase (Tool, Config, SelectableItem, GitDiffError)
- Functions / vars: camelCase (detectInstalledTools, loadConfig, findToolByName)
- Constants: UPPER_SNAKE_CASE (CONFIG_PATH, KNOWN_TOOLS, SAFE_COMMAND_PATTERN, EXIT_CODE_*)
- Booleans: is/has/should prefix (isSafeCommand, isTemplate, hasDiffCommand, promptUseStdin)
- Type-only imports: `import type { ... } from "..."` (verbatimModuleSyntax)
- Node builtins: always "node:child_process" etc.
- Imports order: external (node:*, "fuse.js", "semver"), then types, then local ./
- Path alias: `@/*` -> `src/*` (configured, used in some? but direct relative in sources)

## Where to Add New Code

**New Feature (e.g. new flag or mode):**
- Primary code: `src/<new>.ts` (or extend `src/index.ts` / add under `src/cli/<feature>.ts` if subcommand)
- Tests: `src/<new>.test.ts` (co-located; cover behavior, security cases, parse)
- Update types if new shapes in `src/types.ts`
- Wire in `src/index.ts` main dispatch
- If needs special launch: extend launchTool* or use template safety

**New Component/Module (e.g. new detector):**
- Implementation: `src/<component>.ts`
- Export public API, keep pure where possible
- Add to relevant layer (e.g. detect logic -> detect.ts or new)
- Update AGENTS.md architecture diagram if structural

**New CLI Subcommand:**
- Add `src/cli/<sub>.ts` + test
- Parse/execute in index or dedicated
- Follow diff.ts pattern (context passing, error types)

**Utilities / Shared:**
- Shared helpers: add to existing focused module (e.g. prompts.ts for prompt builders) or small pure file
- Avoid new top-level unless clear boundary
- Config changes: extend validate* + DEFAULT_ in `src/config.ts`

**Build / Config / Docs changes:**
- package.json / scripts / justfile for commands
- .github/workflows/*.yml for CI/release
- README.md + example-config.json for user docs
- AGENTS.md for agent rules
- Run full `bun run ci` + build before commit (per workflow)

**Always:**
- After edit: bun run typecheck && bun run check && bun test (AGENTS)
- Prefer Bun; use tsx only if needed
- Small safe steps; separate tidy from behavior
- Cite paths in comments/docs when relevant

## Special Directories

**dist/:**
- Purpose: Contains the standalone `ai` executable produced by bun --compile
- Generated: Yes (never edit)
- Committed: Appears in working tree after build (gitignore status not strictly excluding in this checkout, but intent is build artifact)

**src/version.ts:**
- Purpose: Single source of runtime version string used in --version and upgrade checks
- Generated: Yes (by scripts/build.sh or release CI writing from package.json or tag)
- Committed: Source committed with placeholder (overwritten); biome linter/formatter disabled via override `biome.json:63`

**.planning/ (and .planning/codebase/):**
- Purpose: Holds planning docs, codemap outputs (this STRUCTURE + ARCHITECTURE), other scratch
- Generated: For analysis tasks
- Committed: Yes (for this repo's process)

**.changeset/:**
- Purpose: Human + machine readable change descriptors consumed by release tooling
- Generated: By changeset tooling on PRs
- Committed: Yes

**node_modules/ + bun.lock:**
- Purpose: Dependency tree (bun)
- Generated: Yes
- Committed: lock yes, node_modules typically not (but present here)

**.github/ + scripts/ + justfile + prek.toml:**
- Purpose: Automation, hooks, task runner (alternative to npm scripts)
- Special: pre-commit hook runs biome; prek adds typecheck + biome on .ts; release does matrix cross-compile

**docs/ + HomebrewFormula/:**
- Purpose: Distribution metadata (pages, brew)
- Synced/copied in workflows

---

*Structure analysis: 2026-06-04*
