# Coding Conventions

**Analysis Date:** 2026-07-18

## Naming Patterns
- **Files:** `kebab-case.ts` (e.g., `fuzzy-select.ts`, `git-diff.ts`). Co-located tests end with `.test.ts`.
- **Functions:** `camelCase` (e.g., `validateToolCommand`, `launchTool`).
- **Variables:** `camelCase` (e.g., `stdinContent`, `exitCode`). Constants are `UPPER_SNAKE_CASE` (e.g., `EXIT_CODE_SUCCESS`, `VERSION`).
- **Types/Interfaces:** `PascalCase` (e.g., `LookupResult`, `MeetingSummary`).

## Code Style
- **Formatting:** Managed by Biome (`biome.json`). Settings include 2 spaces indent, LF line endings, double quotes, always semicolons, and trailing commas `es5`.
- **Linting:** Managed by Biome. `strict` TypeScript rules (`tsconfig.json`). Disallows `any` (`noExplicitAny`), requires using `const`, unused variables will trigger an error.

## Import Organization
- Native Node.js modules are prefixed with `node:` (e.g., `import { spawnSync } from "node:child_process"`).
- Third-party packages and internal modules follow. 
- Path aliases are configured in `tsconfig.json` (`@/*` -> `src/*`).

## Error Handling
- Use `try/catch` blocks for asynchronous and file-system operations. Catch variables are commonly named `error` or `err`.
- Early returns and `process.exit()` with specific exit codes for fatal CLI errors (e.g., `process.exit(EXIT_CODE_VALIDATION_ERROR)`).
- Custom functions often return structured success/error objects instead of throwing (e.g., `{ success: boolean, error?: string }`).

## Logging
- Standard `console.log` for output and `console.error` for warnings/errors. No heavyweight logging framework is used. CLI messages often use emojis (e.g., `✅`, `❌`) for readability.

## Comments
- Code favors readability and clear naming over inline comments. 
- Minimal use of JSDoc/TSDoc; heavily relies on explicit TypeScript types for signatures.

## Function Design
- Functions are kept relatively small and purpose-specific.
- Parameters: Strongly typed. Default parameters are used when applicable.
- Return Values: Clear explicit return types, especially for complex objects or conditionals.

## Module Design
- ES Modules (`"type": "module"` in `package.json`).
- Features export targeted functions (e.g., `export function runPromptCommand`).
- Uses barrel-like patterns occasionally, but mostly specific file imports.
