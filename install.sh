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

# Default to installing both the launcher and the meeting assistant.
# Override with AI_INSTALL_BINARIES, e.g. AI_INSTALL_BINARIES="ai" for just the launcher.
BINARIES="${AI_INSTALL_BINARIES:-ai ai-meeting}"

echo "Detected: $OS-$ARCH"

# Get latest release URL
LATEST_URL="https://api.github.com/repos/${REPO}/releases/latest"
RELEASE_DATA=$(curl -fsSL "$LATEST_URL")
CHECKSUM_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url.*checksums.txt\"" | cut -d '"' -f 4 | head -n 1)

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download checksums once if available
if [ -n "$CHECKSUM_URL" ]; then
  CHECKSUMS=$(curl -fsSL "$CHECKSUM_URL")
fi

for BINARY_NAME in $BINARIES; do
  if [ "$IS_WINDOWS" = true ]; then
    ARTIFACT="${BINARY_NAME}-${OS}-${ARCH}.exe"
    BINARY_FILE="${BINARY_NAME}.exe"
  else
    ARTIFACT="${BINARY_NAME}-${OS}-${ARCH}"
    BINARY_FILE="${BINARY_NAME}"
  fi

  DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url.*${ARTIFACT}\"" | cut -d '"' -f 4 | head -n 1)

  if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: Could not find download URL for $ARTIFACT"
    exit 1
  fi

  echo "Downloading $ARTIFACT from: $DOWNLOAD_URL"

  curl -fsSL "$DOWNLOAD_URL" -o "${INSTALL_DIR}/${BINARY_FILE}"

  # Verify checksum if available
  if [ -n "$CHECKSUMS" ]; then
    EXPECTED=$(echo "$CHECKSUMS" | grep "$ARTIFACT" | head -n 1 | awk '{print $1}')

    if [ -n "$EXPECTED" ]; then
      if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL=$(sha256sum "${INSTALL_DIR}/${BINARY_FILE}" | awk '{print $1}')
      elif command -v shasum >/dev/null 2>&1; then
        ACTUAL=$(shasum -a 256 "${INSTALL_DIR}/${BINARY_FILE}" | awk '{print $1}')
      else
        echo "Warning: No sha256sum or shasum found, skipping verification"
        ACTUAL="$EXPECTED"
      fi

      if [ "$EXPECTED" != "$ACTUAL" ]; then
        echo "Error: Checksum verification failed for $ARTIFACT!"
        echo "Expected: $EXPECTED"
        echo "Actual:   $ACTUAL"
        rm -f "${INSTALL_DIR}/${BINARY_FILE}"
        exit 1
      fi
      echo "Checksum verified for $ARTIFACT ✓"
    fi
  fi

  if [ "$IS_WINDOWS" = false ]; then
    chmod +x "${INSTALL_DIR}/${BINARY_FILE}"
  fi

  echo "✓ Installed $BINARY_FILE to ${INSTALL_DIR}/${BINARY_FILE}"
done

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
