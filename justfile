# AI Launcher - Development tasks

# Run in development mode
dev:
  bun run dev

# Build standalone executable to dist/ai
build:
  bun run build

# TypeScript strict mode type checking
typecheck:
  bun run typecheck

# Biome linting
lint:
  bun run lint

# Auto-fix lint issues
lint-fix:
  bun run lint:fix

# Biome format check
format:
  bun run format

# Auto-format code
format-fix:
  bun run format:fix

# Combined lint + format check
check:
  bun run check

# Auto-fix lint and format
check-fix:
  bun run check:fix

# Full CI: typecheck + check + test
ci:
  bun run ci

# Run all unit tests
test:
  bun test

# Release with version bump
release:
  bun run release:version
