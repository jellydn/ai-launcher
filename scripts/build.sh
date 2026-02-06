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
  echo "Compressing with UPX..."
  
  # Detect if we're on macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected macOS - using --force-macos flag..."
    # Try LZMA compression first with --force-macos (best compression)
    if ! upx --best --lzma --force-macos dist/ai 2>/dev/null; then
      echo "LZMA compression failed, trying standard compression..."
      upx --best --force-macos dist/ai || echo "UPX compression skipped - not supported for this binary"
    fi
  else
    # Linux/other systems - standard UPX
    # Try LZMA compression first (best compression)
    if ! upx --best --lzma dist/ai 2>/dev/null; then
      echo "LZMA compression failed, trying standard compression..."
      upx --best dist/ai || echo "UPX compression skipped - not supported for this binary"
    fi
  fi
else
  echo "Note: UPX not found. Install with 'brew install upx' (macOS) or 'apt-get install upx' (Linux) for better compression."
fi

echo ""
echo "Build complete: dist/ai"
ls -lh dist/ai
