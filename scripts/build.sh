#!/bin/bash
set -e
VERSION=$(node -p "require('./package.json').version")
cat >src/version.ts <<EOF
// This file is generated at build time by scripts/build.sh
// Do not edit manually - it will be overwritten on next build
export const VERSION = "$VERSION";
EOF
bun build src/index.ts --compile --outfile dist/ai
