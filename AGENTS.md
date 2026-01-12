# AGENTS.md

Guidelines for agentic coding agents working on this codebase.

## Project Overview

**ai-cli-switcher** - A fast, secure launcher CLI tool that switches between AI coding assistants using fuzzy search. Built with TypeScript and Bun.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Run in development mode |
| `bun run build` | Build standalone executable to `dist/ai` |
| `bun run typecheck` | TypeScript type checking (strict mode) |
| `bun test` | Run all unit tests |
| `bun test <file>` | Run specific test file |
| `bun run src/index.ts <tool>` | Test with specific tool |

## Code Style Guidelines

### Core Principles

- **Small, Safe Steps**: Make big changes through small, reversible steps
- **Code is Communication**: Write for humans, not machines
- **Eliminate Problems**: Remove complexity rather than managing it
- **Self-Documenting Code**: Use meaningful names and clear structure
- **Separate Tidying from Behavior Changes**: Keep refactoring separate from features

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Interfaces | PascalCase | `Tool`, `Config` |
| Functions/variables | camelCase | `detectTools`, `filteredItems` |
| Constants | UPPER_SNAKE_CASE | `CONFIG_PATH`, `KNOWN_TOOLS` |
| Boolean variables | is/has/should prefix | `isValid`, `hasAlias` |
| Type files | kebab-case | `fuzzy-select.ts` |

### Imports

- Use `node:` prefix for built-in modules: `import { spawnSync } from "node:child_process"`
- Separate type imports: `import type { Tool } from "./types"`
- Group imports: external libraries first, then types, then internal modules

### TypeScript

- **Strict mode enabled**: All strict flags in tsconfig.json
- No `any` - use `unknown` for truly dynamic values
- Explicit return types for public/exported functions
- `noUncheckedIndexedAccess` enforced - always check array access
- `noImplicitOverride` - use `override` keyword when overriding parent methods
- `noUnusedLocals` and `noUnusedParameters` - remove unused code

```typescript
export function detectInstalledTools(): Tool[] {
  const detected: Tool[] = [];
  return detected;
}
```

### Formatting

- 2-space indentation
- No comments unless explaining non-obvious logic
- Prefer readable one-liners for simple operations
- Use helper variables for complex expressions

### Guard Clauses

Move preconditions to the top and return early:

```typescript
function processTool(tool: Tool | null) {
  if (!tool) return;
  if (!tool.command) return;
  // main logic
}
```

### Error Handling

- Use `Error` instances with descriptive messages
- Validation errors return arrays with `path` and `message`:

```typescript
interface ConfigValidationError {
  path: string;
  message: string;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

### Security

- Validate all commands with regex patterns before execution
- Sanitize user input for shell commands
- Use allowlist patterns, not denylists

## Architecture

```
src/
  index.ts        - CLI entrypoint and main orchestration
  config.ts       - Config loading, validation, and file operations
  detect.ts       - Auto-detect installed AI CLI tools
  fuzzy-select.ts - Interactive terminal UI with fuzzy search
  lookup.ts       - Tool lookup by name, alias, or fuzzy match
  types.ts        - Type definitions and interfaces
  logo.ts         - ASCII logo and colors
```

### Module Responsibilities

- **index.ts**: CLI entrypoint, argument parsing, tool launching
- **config.ts**: Read/write `~/.config/ai-switcher/config.json`, validate config
- **detect.ts**: Find installed tools (claude, opencode, amp, ccs profiles)
- **fuzzy-select.ts**: Terminal-based interactive selection with arrow keys
- **lookup.ts**: Search tools by name, aliases, or fuzzy matching
- **types.ts**: `Tool`, `Template`, `Config`, `SelectionResult` interfaces

## Testing

Write tests that give confidence to change:
- Test behavior, not implementation details
- Focus on user-facing functionality
- Add tests for new features in `<module>.test.ts` files

## Development Workflow

1. Run `bun run typecheck` after changes - must pass with no errors
2. Test with `bun test` (or specific test file)
3. Build with `bun run build` before committing
4. Keep changes small and reversible
