# Technology Stack

**Analysis Date:** 2026-06-04

## Languages

**Primary:**
- TypeScript (strict, ESNext target) - Core application logic, CLI entrypoint, all modules in `src/*.ts` (e.g. `src/index.ts:1`, `src/detect.ts`, `src/config.ts:1`); types in `src/types.ts`; path alias `@/*` in `tsconfig.json:24`

**Secondary:**
- Shell (Bash, POSIX sh) - Build, install, and hook scripts: `scripts/build.sh:1` (generates `src/version.ts`), `install.sh:1`, `scripts/setup-hooks.sh`, `justfile:1`, `scripts/sync-readme.sh`, `scripts/pre-commit`

## Runtime

**Environment:**
- Bun (runtime + bundler) - Shebang `src/index.ts:1` (`#!/usr/bin/env bun`), `package.json:12` (`"dev": "bun run src/index.ts"`), `package.json:22` ci script, `@types/bun` in devDeps `package.json:28`, CI setup ` .github/workflows/ci.yml:15` (oven-sh/setup-bun@v2 with latest)

**Package Manager:**
- Bun - Primary; lockfile: present (`bun.lock` at repo root, lockfileVersion 1)
- No npm/yarn/pnpm lockfiles

## Frameworks

**Core:**
- None (lightweight pure TypeScript CLI; relies on Node.js built-ins under Bun + minimal deps)

**Testing:**
- Bun test (`bun:test`) - `import { describe, test, expect } from "bun:test"` in all `*.test.ts` (e.g. `src/config.test.ts:1`, `src/detect.test.ts:1`, `src/index.test.ts`, `src/fuzzy-select.test.ts`, `src/lookup.test.ts`, `src/upgrade.test.ts`, `src/template.test.ts`, `src/git-diff.test.ts`, `src/cli/diff.test.ts`, `src/prompt-escaping.test.ts`); per `AGENTS.md:123`

**Build/Dev:**
- Biome 2.4.16 - Linting + formatting: `biome.json:1` (schema 2.4.10, lineWidth 100, indent 2, double quotes, semicolons always, noExplicitAny error, useConst error), `package.json:16-21` (lint, format, check scripts), overrides for `src/version.ts`
- TypeScript ^6.0.3 - Strict type checking: `tsconfig.json:14` ("strict": true, "noUncheckedIndexedAccess": true, "noUnusedLocals": true, "verbatimModuleSyntax": true, "noEmit": true, "module": "Preserve"), `package.json:14` ("typecheck": "tsc --noEmit")
- bun build --compile - Standalone executable: `scripts/build.sh:9` (`bun build src/index.ts --compile --outfile dist/ai`), also in release `.github/workflows/release.yml:63`

## Key Dependencies

**Critical:**
- fuse.js ^7.3.0 - Fuzzy search matching for interactive TUI and name lookup: `src/fuzzy-select.ts:1` (`import Fuse from "fuse.js"`), config `new Fuse(items, { keys: ["name", "description", "aliases"], threshold: 0.4 })`, also `src/lookup.ts:1` and `src/lookup.ts:37`
- semver ^7.7.4 - Semantic version comparison for upgrade check: `src/upgrade.ts:6` (`import { gte as semverGte } from "semver"`), `src/upgrade.ts:97` (`semverGte(VERSION, latestVersion)`)

**Infrastructure:**
- Node.js built-ins (via Bun) - `node:child_process` (spawnSync/execSync for tool detection/launch/git/diff/which/ccs/gh): `src/index.ts:4`, `src/detect.ts:1`, `src/git-diff.ts:1`, `src/upgrade.ts:1`; `node:fs` / `node:fs/promises`, `node:path`, `node:os`, `node:crypto` (for upgrade temp files, checksums, paths): `src/config.ts:1`, `src/index.ts:5`, `src/upgrade.ts:3-5`

## Configuration

**Environment:**
- File-based user config (no env vars required for core use): `~/.config/ai-launcher/config.json` (`src/config.ts:7` `CONFIG_DIR = join(homedir(), ".config", "ai-launcher")`, `src/config.ts:8` `CONFIG_PATH`), auto-creates defaults on first run `src/config.ts:252-254`; old migration from `~/.config/ai-switcher`
- Validation enforced at load: `src/config.ts:260` (validateConfig), safe patterns and $@ limit in `src/template.ts:7` and `src/config.ts:149`

**Build:**
- `scripts/build.sh` (version injection + compile), `tsconfig.json`, `biome.json`, `package.json` scripts, `.github/workflows/release.yml:53` (version.ts gen in CI), `renovate.json`

## Platform Requirements

**Development:**
- Bun runtime (install via https://bun.sh), `bun install`, `bun run dev` / `bun run typecheck` / `bun run check` / `bun test` per `AGENTS.md:129-134`, `README.md:659`; macOS/Linux/Windows supported for dev with TTY for interactive

**Production:**
- Standalone native executable `dist/ai` (or `ai.exe` on win) produced by `bun build --compile --target=...` for darwin-{x64,arm64}, linux-{x64,arm64}, windows-x64; distributed via GitHub Releases ` .github/workflows/release.yml:14` matrix, Homebrew `HomebrewFormula/ai.rb`, one-line curl `install.sh:37`; runs without Bun installed

---

*Stack analysis: 2026-06-04*
