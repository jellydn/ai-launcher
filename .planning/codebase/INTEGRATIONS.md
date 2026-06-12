# External Integrations

**Analysis Date:** 2026-06-04

## APIs & External Services

**GitHub Releases API:**
- GitHub - Fetches latest release metadata, lists assets, downloads platform binaries and checksums.txt for self-upgrade and distribution
- SDK/Client: native `fetch` (no third-party package)
- Auth: none (public unauthenticated endpoints)

**Local AI CLI Tool Spawning (user-installed):**
- Detected tools (claude, gemini, opencode, amp, grok, ccs, ollama, cursor/agent, gh copilot, etc.) - Launched via subprocess to provide the actual AI coding functionality; also `ccs api list` for profile discovery and `gh copilot --version`
- SDK/Client: `node:child_process` spawnSync (see `src/detect.ts:166`, `src/detect.ts:221`, `src/index.ts:184`)
- Auth: delegated to the individual tools (OAuth or api_key metadata only in `src/types.ts:8` `authType`)

**Git (for diff analysis):**
- Git - Invoked for `git diff --cached`, `git diff <ref>`, `git rev-parse --git-dir` to support `--diff-staged` / `--diff-commit` features
- SDK/Client: `spawnSync("git", ...)` in `src/git-diff.ts:36` and `src/git-diff.ts:87`
- Auth: none (local repo operations)

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem only - User config `~/.config/ai-launcher/config.json` (`src/config.ts:7`), temp binary during upgrade `src/upgrade.ts:114` (in `tmpdir()`), output files for `--diff-output` (validated relative paths in `src/index.ts:32`)

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None (no auth provider integrated into the launcher itself)

**Implementation:**
- No authentication, tokens, or login flows in the app; `authType` is only descriptive metadata for auto-detected proxy profiles (`src/detect.ts:250` "oauth", `src/detect.ts:237` "api_key") passed through to spawned tools

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Console-based (stdout/stderr) - Direct `console.log`, `console.error`, `console.warn` for messages, errors, progress; no structured logging, files, or external services (examples throughout `src/index.ts`, `src/upgrade.ts:90`)

## CI/CD & Deployment

**Hosting:**
- GitHub Releases (binaries + checksums hosted at https://github.com/jellydn/ai-launcher/releases; referenced in `install.sh:39`, `HomebrewFormula/ai.rb:8`, `src/upgrade.ts:9`)

**CI Pipeline:**
- GitHub Actions - Workflows: `.github/workflows/ci.yml` (checkout@v6, setup-bun, typecheck/check/test), `.github/workflows/release.yml` (multi-arch bun build, upload-artifact@v7, softprops/action-gh-release@v3, checksums, homebrew tap update), `.github/workflows/version.yml` (bumpp auto), `.github/workflows/sync-readme.yml`

## Environment Configuration

**Required env vars:**
- None for normal operation or interactive use
- Optional path discovery only (in upgrade): `HOME`, `LOCALAPPDATA` (`src/upgrade.ts:39`, `src/upgrade.ts:42`)

**Secrets location:**
- None (application stores no secrets, tokens, or credentials; config is plain JSON without sensitive data)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-06-04*
