---
"ai-launcher": patch
---

Fix validated codebase concerns

- Detect tools on Windows using `where` instead of the missing `which`, and skip commands that shadow Windows built-ins (e.g. `cmd`).
- Extract shared input validators to `src/validators.ts` so runtime checks and tests no longer drift.
- Fix output-path validation: reject Windows absolute paths cross-platform, block nested hidden dirs (`.git`/`.config`) at any depth, and stop false-positiving on nested dirs that merely contain a protected name as a substring.
- Cap piped stdin at 10MB, aborting before the payload is fully buffered.
- Bound upgrade network calls with timeouts (including the binary body download) and a download size guard.
- Memoize tool detection within a single invocation.
