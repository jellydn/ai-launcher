#!/bin/sh
set -e

REPO="jellydn/ai-cli-switcher"
BINARY_NAME="ai"
INSTALL_DIR="${AI_INSTALL_DIR:-$HOME/.local/bin}"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux*)  OS="linux" ;;
  Darwin*) OS="darwin" ;;
  *)       echo "Unsupported OS: $OS"; exit 1 ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)  ARCH="x64" ;;
  aarch64) ARCH="arm64" ;;
  arm64)   ARCH="arm64" ;;
  *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

ARTIFACT="ai-${OS}-${ARCH}"
echo "Detected: $OS-$ARCH"

# Get latest release URL
LATEST_URL="https://api.github.com/repos/${REPO}/releases/latest"
DOWNLOAD_URL=$(curl -fsSL "$LATEST_URL" | grep "browser_download_url.*${ARTIFACT}\"" | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "Error: Could not find download URL for $ARTIFACT"
  exit 1
fi

echo "Downloading from: $DOWNLOAD_URL"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download and install
curl -fsSL "$DOWNLOAD_URL" -o "${INSTALL_DIR}/${BINARY_NAME}"
chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

echo ""
echo "✓ Installed $BINARY_NAME to ${INSTALL_DIR}/${BINARY_NAME}"

# Check if in PATH
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  echo ""
  echo "Add to your PATH by adding this to your shell config:"
  echo ""
  echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
  echo ""
fi

echo "Run 'ai --help' to get started!"
