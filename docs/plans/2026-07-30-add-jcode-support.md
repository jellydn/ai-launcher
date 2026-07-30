# Plan: Add J-Code (`jcode`) launcher support

**Date:** 2026-07-30  
**Status:** Ready for PR

## Goal

Auto-detect and launch [J-Code](https://github.com/) (`jcode`) from `ai`, same as other known AI CLIs.

## CLI facts (from `jcode --help` / `jcode run --help`)

| Item | Value |
|------|--------|
| Binary | `jcode` (`/opt/homebrew/bin/jcode`) |
| Version seen | `v0.64.2` |
| Default launch | `jcode` (interactive TUI) |
| One-shot | `jcode run <MESSAGE>` |
| Description | Coding agent using Claude Max or ChatGPT Pro subscriptions |

## Scope (confirmed)

- **In:** Add to `KNOWN_TOOLS` for detect + interactive launch only
- **Out:** `promptCommand` / `--diff` wiring; suggested-install list

## Changes

1. `src/detect.ts` — append `{ name, command, description }` for `jcode`
2. `src/detect.test.ts` — config assertion test (pattern of `droid` / `pi`)
3. `README.md` — list `jcode` in auto-detect blurb + supported tools section
4. Branch + PR with commitizen message (`feat: …`)

## Verification

- `bun test src/detect.test.ts`
- `bun run typecheck` / `bun run check`
- Manual: `bun run src/index.ts jcode` when `jcode` is on PATH
