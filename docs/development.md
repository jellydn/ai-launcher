# Development

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) - Fast JavaScript runtime
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/jellydn/ai-cli-switcher
cd ai-cli-switcher

# Install dependencies
bun install
```

## Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Run in development mode |
| `bun run build` | Build standalone executable to `dist/ai` |
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

## Development Workflow

1. Make changes to the code
2. Run type checking: `bun run typecheck`
3. Run linting and formatting: `bun run check`
4. Run tests: `bun test`
5. Test manually: `bun run src/index.ts <toolname>`
6. Build: `bun run build`

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

### Formatting & Linting

- **Line width**: 100 characters
- **Quotes**: Double quotes (`"`), always with semicolons
- **Indentation**: 2 spaces

### Imports & Naming

- Use `node:` prefix for built-in modules
- Separate type imports: `import type { Tool } from "./types"`
- Group imports: external libraries, then types, then internal modules
- Interfaces: PascalCase (`Tool`, `Config`)
- Functions/variables: camelCase (`detectTools`)
- Constants: UPPER_SNAKE_CASE (`CONFIG_PATH`)
- Boolean: is/has/should prefix (`isValid`)

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

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/config.test.ts

# Run with watch mode (if supported)
bun test --watch
```

## Building

```bash
# Build standalone executable
bun run build

# This runs scripts/build.sh which:
# 1. Generates src/version.ts with current version
# 2. Compiles TypeScript and bundles dependencies
# 3. Creates executable at dist/ai
```

## Manual Testing

```bash
# Test auto-detection
bun run src/index.ts

# Test direct invocation
bun run src/index.ts claude --version
bun run src/index.ts opencode --help

# Test error handling
bun run src/index.ts nonexistent-tool

# Test alias support (if configured)
bun run src/index.ts c

# Test template with arguments
bun run src/index.ts summarize file.txt

# Test template with stdin
cat file.txt | bun run src/index.ts summarize
git diff | bun run src/index.ts review

# Test git diff analysis
bun run src/index.ts claude --diff-staged
bun run src/index.ts --diff-commit HEAD~1
```

## Security Features

- **Input Validation**: All commands and arguments validated before execution
- **Command Injection Prevention**: Regex-based sanitization of unsafe characters
- **Template Safety**: Validated placeholder substitution (`$@` syntax only)
- **Path Protection**: Commands validated against allowlist patterns

## Platform Compatibility

### Tested Platforms

- **macOS**: Full functionality including interactive fuzzy search
- **Linux**: Full functionality including interactive fuzzy search
- **Windows**: Basic functionality, interactive mode may have limitations

### Terminal Requirements

- TTY support for interactive mode
- ANSI color support (optional, enhances experience)
- UTF-8 encoding recommended

## Troubleshooting

### Build Issues

```bash
# Clean and rebuild
rm -rf dist node_modules
bun install
bun run build
```

### Type Checking Errors

```bash
# Check for TypeScript errors
bun run typecheck

# Common fixes:
# - Add explicit type annotations
# - Use type guards for dynamic values
# - Check array/object access
```

### Test Failures

```bash
# Run tests with verbose output
bun test --verbose

# Run specific test file
bun test src/config.test.ts
```

## Contributing Workflow

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `bun test`
5. Run type checking: `bun run typecheck`
6. Run linting: `bun run check:fix`
7. Commit with clear message: `git commit -m "feat: add new feature"`
8. Push to your fork: `git push origin feature/my-feature`
9. Create a Pull Request

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG (if exists)
3. Commit: `git commit -m "chore: bump version to x.y.z"`
4. Tag: `git tag vx.y.z`
5. Push: `git push && git push --tags`
6. GitHub Actions will create release and build binaries
