---
"ai-launcher": minor
---

Add `ai-summary` content summarizer as a built-in `ai summary` subcommand

Introduces a new `summary` command inside the `ai` launcher (`ai summary`) that summarizes articles, emails, newsletters, and URLs. Supports multiple modes (`tldr`, `actions`, `linkedin`, `technical`), structured JSON output, streaming, and multiple providers including the free OpenCode and OpenRouter options. Default config is now merged into existing `config.json` so existing users receive the new `summary` template.
