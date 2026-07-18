# External Integrations

**Analysis Date:** 2026-07-18

## APIs & External Services
- **OpenAI**: Used for generating AI summaries and meeting notes. Uses `openai` SDK (`src/summary/providers/openai.ts`, `src/meeting/index.ts`). Auth env var: `OPENAI_API_KEY`.
- **Anthropic**: Used as an AI provider for summaries (`src/summary/providers/anthropic.ts`). Uses standard HTTP or OpenAI SDK wrapper. Auth env var: `ANTHROPIC_API_KEY`.
- **Ollama**: Used for local LLM inference for summaries (`src/summary/providers/ollama.ts`). Auth env var: `OLLAMA_HOST` (API endpoint, no auth).
- **OpenRouter**: Used as an AI model aggregator for summaries and meetings (`src/summary/providers/openrouter.ts`). Uses `openai` SDK. Auth env var: `OPENROUTER_API_KEY`.
- **OpenCode**: Used as a fallback agent for plans/summaries (`src/summary/providers/opencode.ts`). Auth env var: `OPENCODE_AGENT`.

## Data Storage
- **Databases**: None.
- **File Storage**: Local file system (e.g., reading/writing markdown files for notes or `~/.config/ai-launcher/config.json` for tool configurations).
- **Caching**: None explicitly configured, entirely stateless between runs.

## Authentication & Identity
- **Auth Provider**: No centralized auth. Relies entirely on developer-provided API keys in environment variables for integrations.
- **Implementation approach**: Checks `process.env` and local `~/.config/ai-launcher/config.json` at runtime.

## Monitoring & Observability
- **Error Tracking**: Basic CLI standard exit codes (e.g., `process.exit(1)`) and standard error logging (`console.error`).
- **Logs**: Output to standard IO (stdout/stderr).

## CI/CD & Deployment
- **Hosting**: Distributed as pre-compiled standalone binaries via GitHub Releases and Homebrew tap (`jellydn/homebrew-tap`).
- **CI Pipeline**: GitHub Actions (`.github/workflows/ci.yml` and `release.yml`) testing with `bun test`, building with `bun build --compile`, and publishing.

## Environment Configuration
- **Required env vars**: None required for core launcher/fuzzy search functionality. AI features require at least one provider key (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.).
- **Secrets location**: User's local environment or `.env` files. CI uses `HOMEBREW_TAP_TOKEN` and `GITHUB_TOKEN` for publishing.

## Webhooks & Callbacks
- **Incoming**: None
- **Outgoing**: None
