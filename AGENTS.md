# AGENTS.md

Guidelines for agentic coding agents working on this codebase.

## Project Overview

**ai-launcher** - A fast, secure launcher CLI tool that switches between AI coding assistants using fuzzy search. Built with TypeScript and Bun.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Run in development mode |
| `bun run build` | Build standalone executable to `dist/ai` (generates `src/version.ts`) |
| `bun run typecheck` | TypeScript strict mode type checking |
| `bun run lint` | Biome linting |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run format` | Biome format check |
| `bun run format:fix` | Auto-format code |
| `bun run check` | Combined lint + format check |
| `bun run check:fix` | Auto-fix lint and format |
| `bun run ci` | Full CI: typecheck + check + test |
| `bun test` | Run all unit tests |
| `bun test src/config.test.ts` | Run specific test file |
| `bun run src/index.ts claude` | Test with specific tool |

## Code Style Guidelines

### Core Principles

- **Small, Safe Steps**: Make big changes through small, reversible steps
- **Code is Communication**: Write for humans, not machines
- **Separate Tidying from Behavior Changes**: Keep refactoring separate from features

### TypeScript

- **Strict mode**: All strict flags enabled in tsconfig.json
- No `any` - use `unknown` for truly dynamic values
- Explicit return types for public/exported functions
- `noUncheckedIndexedAccess` - always check array/object access
- `noUnusedLocals` and `noUnusedParameters` - remove unused code
- `verbatimModuleSyntax` - type imports must use `import type`
- Path alias `@/*` resolves to `src/*`

### Biome Formatting & Linting

- **Line width**: 100 characters
- **Quotes**: Double quotes (`"`), always with semicolons
- **Indentation**: 2 spaces
- **Key rules**:
  - `noExplicitAny`: error
  - `noUnusedVariables`: error
  - `useConst`: error
  - `noNonNullAssertion`: warn

### Imports & Naming

- Use `node:` prefix for built-in modules
- Separate type imports: `import type { Tool } from "./types"`
- Group imports: external libraries, then types, then internal modules
- Interfaces: PascalCase (`Tool`, `Config`)
- Functions/variables: camelCase (`detectTools`)
- Constants: UPPER_SNAKE_CASE (`CONFIG_PATH`)
- Boolean: is/has/should prefix (`isValid`)
- Type files: kebab-case (`fuzzy-select.ts`)

### Patterns

**Guard clauses** - move preconditions to top:
```typescript
function processTool(tool: Tool | null) {
  if (!tool) return;
  if (!tool.command) return;
  // main logic
}
```

**Async main with error handling**:
```typescript
async function main(): Promise<void> {
  // ... async logic
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

**Validation errors**:
```typescript
function findToolByName(query: string): LookupResult {
  const match = items.find((i) => i.name === query);
  if (!match) return { success: false, error: "Tool not found" };
  return { success: true, item: match.tool };
}
```

### Security

- Validate commands with regex before execution
- Sanitize user input for shell commands
- Use allowlist patterns, not denylists

## Architecture

```
src/
  index.ts        - CLI entrypoint, argument parsing, tool launching
  config.ts       - Config loading, validation, and file operations
  detect.ts       - Auto-detect installed AI CLI tools
  fuzzy-select.ts - Interactive terminal UI with fuzzy search
  lookup.ts       - Tool lookup by name, alias, or fuzzy match
  template.ts     - Template configuration
  upgrade.ts      - Upgrade functionality
  types.ts        - Type definitions and interfaces
  logo.ts         - ASCII logo and colors
  version.ts      - Generated at build time (.gitignore)
```

## Testing

- Use Bun's test framework: `import { describe, test, expect } from "bun:test"`
- Test behavior, not implementation details
- Add tests for new features in `<module>.test.ts` files
- Write tests that give confidence to change

## Development Workflow

1. Run `bun run typecheck` - must pass with no errors
2. Run `bun run check` - linting and formatting
3. Test with `bun test` or specific file `bun test src/config.test.ts`
4. Build with `bun run build` before committing
5. Keep changes small and reversible
