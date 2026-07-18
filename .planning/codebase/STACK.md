# Technology Stack

**Analysis Date:** 2026-07-18

## Languages
**Primary:** TypeScript, version >=6.0.3, used for core application logic and CLI.
**Secondary:** Bash, used for installation (`install.sh`) and build scripts (`scripts/build.sh`).

## Runtime
**Environment:** Bun, latest version
**Package Manager:** Bun, latest version (`bun.lock`)

## Frameworks
**Core:** Node.js APIs (e.g., `node:fs`, `node:child_process`) via Bun compatibility layer, purpose: CLI operations and system integration.
**Testing:** Bun test runner (`bun test`), purpose: unit and integration testing.
**Build/Dev:** 
- `tsc` (TypeScript compiler) version ^6.0.3, purpose: type checking (`--noEmit`).
- `@biomejs/biome` version 2.4.16, purpose: fast linting and formatting.
- `bumpp` version ^11.0.1, purpose: version bumping and tagging releases.

## Key Dependencies
**Critical:** 
- `fuse.js` version ^7.3.0, why it matters: fuzzy searching AI tools and prompts.
- `openai` version 6.45.0, why it matters: primary SDK for interacting with OpenAI and other compatible AI endpoints (Anthropic, OpenRouter).
- `zod` version ^3.24.1, why it matters: defining and parsing structured outputs (e.g., JSON schemas for meetings).
**Infrastructure:** 
- `semver` version ^7.7.4, purpose: version comparison and parsing.

## Configuration
**Environment:** Configured via `process.env` (e.g., `OPENAI_API_KEY`), and local user config (`~/.config/ai-launcher/config.json`).
**Build:** `tsconfig.json` for TypeScript configuration, `biome.json` for code quality rules, and `package.json` for scripts.

## Platform Requirements
**Development:** Bun runtime
**Production:** Pre-compiled standalone binaries for macOS (arm64, x64), Linux (arm64, x64), and Windows (x64) via `bun build --compile`.
