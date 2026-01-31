#!/bin/bash
# Sync README.md to docs/_README.md for Docsify

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
README_SOURCE="$REPO_ROOT/README.md"
README_DEST="$REPO_ROOT/docs/_README.md"

# Check if README.md exists
if [ ! -f "$README_SOURCE" ]; then
  echo "Error: README.md not found at $README_SOURCE"
  exit 1
fi

# Copy README.md to docs/_README.md
cp "$README_SOURCE" "$README_DEST"

echo "✓ Synced README.md to docs/_README.md"
echo "  Source: $README_SOURCE"
echo "  Destination: $README_DEST"
