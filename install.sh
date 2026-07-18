#!/bin/sh
set -e

REPO="jellydn/ai-launcher"
INSTALL_DIR="${AI_INSTALL_DIR:-$HOME/.local/bin}"

# Detect OS
OS="$(uname -s)"
IS_WINDOWS=false
case "$OS" in
  Linux*)           OS="linux" ;;
  Darwin*)          OS="darwin" ;;
  MINGW*|MSYS*|CYGWIN*)
    OS="windows"
    IS_WINDOWS=true
    ;;
  *)  echo "Unsupported OS: $OS"; exit 1 ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)  ARCH="x64" ;;
  aarch64) ARCH="arm64" ;;
  arm64)   ARCH="arm64" ;;
  *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

if [ "$IS_WINDOWS" = true ]; then
  ARTIFACT="ai-${OS}-${ARCH}.exe"
  BINARY_NAME="ai.exe"
else
  ARTIFACT="ai-${OS}-${ARCH}"
  BINARY_NAME="ai"
fi

echo "Detected: $OS-$ARCH"

# Get latest release URL (prefer jq, then node; grep is last-resort)
LATEST_URL="https://api.github.com/repos/${REPO}/releases/latest"
RELEASE_DATA=$(curl -fsSL "$LATEST_URL")

extract_asset_url() {
  asset_name="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$RELEASE_DATA" | jq -r --arg name "$asset_name" \
      '.assets[] | select(.name == $name) | .browser_download_url' | head -n 1
  elif command -v node >/dev/null 2>&1; then
    printf '%s' "$RELEASE_DATA" | node -e "
      const name = process.argv[1];
      const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      const asset = (data.assets || []).find((a) => a.name === name);
      process.stdout.write(asset?.browser_download_url || '');
    " "$asset_name"
  else
    # Fragile if GitHub changes JSON whitespace — prefer jq/node when available
    printf '%s' "$RELEASE_DATA" | grep "browser_download_url.*${asset_name}\"" | cut -d '"' -f 4 | head -n 1
  fi
}

DOWNLOAD_URL=$(extract_asset_url "$ARTIFACT")
CHECKSUM_URL=$(extract_asset_url "checksums.txt")

if [ -z "$DOWNLOAD_URL" ]; then
  echo "Error: Could not find download URL for $ARTIFACT"
  exit 1
fi

echo "Downloading from: $DOWNLOAD_URL"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download binary
curl -fsSL "$DOWNLOAD_URL" -o "${INSTALL_DIR}/${BINARY_NAME}"

# Verify checksum if available
if [ -n "$CHECKSUM_URL" ]; then
  echo "Verifying checksum..."
  CHECKSUMS=$(curl -fsSL "$CHECKSUM_URL")
  EXPECTED=$(echo "$CHECKSUMS" | grep "$ARTIFACT" | head -n 1 | awk '{print $1}')

  if [ -n "$EXPECTED" ]; then
    if command -v sha256sum >/dev/null 2>&1; then
      ACTUAL=$(sha256sum "${INSTALL_DIR}/${BINARY_NAME}" | awk '{print $1}')
    elif command -v shasum >/dev/null 2>&1; then
      ACTUAL=$(shasum -a 256 "${INSTALL_DIR}/${BINARY_NAME}" | awk '{print $1}')
    else
      echo "Warning: No sha256sum or shasum found, skipping verification"
      ACTUAL="$EXPECTED"
    fi

    if [ "$EXPECTED" != "$ACTUAL" ]; then
      echo "Error: Checksum verification failed!"
      echo "Expected: $EXPECTED"
      echo "Actual:   $ACTUAL"
      rm -f "${INSTALL_DIR}/${BINARY_NAME}"
      exit 1
    fi
    echo "Checksum verified ✓"
  fi
fi

if [ "$IS_WINDOWS" = false ]; then
  chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
fi

echo "✓ Installed $BINARY_NAME to ${INSTALL_DIR}/${BINARY_NAME}"

# Check if in PATH (POSIX-compliant)
case ":$PATH:" in
  *:"$INSTALL_DIR":*)
    ;;
  *)
    echo ""
    echo "Add to your PATH by adding this to your shell config:"
    echo ""
    echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
    echo ""
    ;;
esac

echo "Run 'ai --help' to get started!"
