#!/bin/bash
set -e
VERSION=$(node -p "require('./package.json').version")
cat >src/version.ts <<EOF
// This file is generated at build time by scripts/build.sh
// Do not edit manually - it will be overwritten on next build
export const VERSION = "$VERSION";
EOF

echo "Building with minification..."
bun build src/index.ts --compile --minify --outfile dist/ai

# Strip debug symbols if strip is available (reduces binary size)
if command -v strip >/dev/null 2>&1; then
  echo "Stripping debug symbols..."
  strip dist/ai 2>/dev/null || echo "Note: strip command failed or not applicable"
fi

# Compress with UPX if available (major size reduction)
if command -v upx >/dev/null 2>&1; then
  # Detect if we're on macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Note: UPX compression is disabled on macOS due to compatibility issues."
    echo "      UPX-compressed binaries cannot run on modern macOS (terminated by SIGKILL)."
    echo "      The binary will be larger than Linux builds, but will function correctly."
  else
    # Linux/other systems - standard UPX
    echo "Compressing with UPX..."
    SKIP_MSG="UPX compression skipped - not supported for this binary"
    # Try LZMA compression first (best compression)
    if ! upx --best --lzma dist/ai 2>/dev/null; then
      echo "LZMA compression failed, trying standard compression..."
      upx --best dist/ai || echo "$SKIP_MSG"
    fi
  fi
else
  echo "Note: UPX not found. Install with 'apt-get install upx' (Linux) for better compression."
  echo "      Note: UPX is not recommended on macOS due to compatibility issues."
fi

echo ""
echo "Build complete: dist/ai"
ls -lh dist/ai
