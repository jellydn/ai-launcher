#!/bin/bash
set -e
VERSION=$(node -p "require('./package.json').version")
cat >src/version.ts <<EOF
// This file is generated at build time by scripts/build.sh
// Do not edit manually - it will be overwritten on next build
export const VERSION = "$VERSION";
EOF
bun build src/index.ts --compile --minify --outfile dist/ai

# Strip debug symbols if strip is available (reduces binary size)
if command -v strip >/dev/null 2>&1; then
  strip dist/ai 2>/dev/null || echo "Note: strip command failed or not applicable"
fi

echo "Build complete: dist/ai"
ls -lh dist/ai
