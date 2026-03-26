# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- TypeScript 5 (strict mode) - All source and test code in `src/`

## Runtime

**Environment:**
- Bun (latest) - Runtime, test runner, and build compiler

**Package Manager:**
- Bun
- Lockfile: present (`bun.lock`)

## Frameworks

**Core:**
- None — pure Node.js/Bun built-in modules (`node:child_process`, `node:fs`, `node:path`, `node:os`, `node:crypto`)

**Testing:**
- Bun native test framework (`bun:test`) — `describe`, `test`, `expect`

**Build/Dev:**
- Bun compiler (`bun build --compile`) — produces standalone executables
- Biome 2.3.11 — linting and formatting
- TypeScript 5 — strict type checking (`tsc --noEmit`)

## Key Dependencies

**Critical:**
- `fuse.js` 7.1.0 — Fuzzy search powering the interactive tool selector
- `semver` 7.6.0 — Version comparison for the upgrade feature

**Dev:**
- `@biomejs/biome` 2.3.11 — Lint + format (replaces ESLint + Prettier)
- `typescript` 5.x — Type checking only (no emit; Bun handles transpilation)

## Configuration

**Environment:**
- No `.env` files; no runtime environment variables required
- User config stored at `~/.config/ai-switcher/config.json`

**Build:**
- `tsconfig.json` — strict mode, path alias `@/*` → `src/*`, `verbatimModuleSyntax`
- `biome.json` — 100-char line width, double quotes, 2-space indent
- `package.json` scripts: `dev`, `build`, `typecheck`, `lint`, `check`, `ci`, `test`
- `scripts/build.sh` — generates `src/version.ts` from `package.json` version, then compiles

## Platform Requirements

**Development:**
- Bun installed (`bun install`)
- Git (for diff analysis feature)

**Production:**
- Standalone binary; no runtime dependencies
- Multi-platform targets built via GitHub Actions:
  - `bun-linux-x64`, `bun-linux-arm64`
  - `bun-darwin-x64`, `bun-darwin-arm64`
  - `bun-windows-x64`

---

*Stack analysis: 2026-01-31*
