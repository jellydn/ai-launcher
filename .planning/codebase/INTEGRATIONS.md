# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**GitHub API (upgrade feature):**
- Fetches latest release from `https://api.github.com/repos/jellydn/ai-cli-switcher/releases/latest`
- Downloads platform-specific binaries with SHA256 checksum verification
- SDK/Client: native `node:https` / `fetch`
- Auth: None (public repo, unauthenticated API calls)

**AI CLI Tools (launched by this tool):**
- Claude CLI (Anthropic) — `claude`
- OpenCode CLI — `opencode`
- Sourcegraph Amp CLI — `amp`
- CCS (Claude Code Switch) — `ccs` with profile detection via `ccs api list`

**Git (diff analysis feature):**
- `git diff --cached` — staged changes
- `git diff <ref>` — diff against a commit reference
- `git rev-parse --git-dir` — repository detection
- SDK/Client: `node:child_process.spawnSync`

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem only
- User config: `~/.config/ai-switcher/config.json`
- Binary self-update writes to the executable's own path

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None — this tool launches other CLIs that handle their own auth

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- `console.error` for error output; `console.log` for status messages
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- GitHub Releases (binary distribution)
- Homebrew tap (`jellydn/homebrew-tap`) for macOS installs

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`)
  - `ci.yml` — typecheck + biome check + tests on push/PR to `main`
  - `release.yml` — version bump → multi-platform build matrix → GitHub release → Homebrew tap update
- Secrets required: `HOMEBREW_TAP_TOKEN`

## Environment Configuration

**Required env vars:**
- None at runtime

**Secrets location:**
- GitHub Actions repository secrets (`HOMEBREW_TAP_TOKEN`)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-01-31*
