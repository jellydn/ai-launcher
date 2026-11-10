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

# Stage on the destination filesystem so replacement happens only after validation.
mkdir -p "$INSTALL_DIR"
STAGING_DIR=$(mktemp -d "${INSTALL_DIR}/.ai-install.XXXXXX")
trap 'rm -rf "$STAGING_DIR"' 0
trap 'exit 1' HUP INT TERM

# Only retry read-only transfers with transient errors. Curl 35 also covers
# persistent TLS configuration errors, so require an explicit reset diagnostic.
download() {
  url="$1"
  destination="$2"
  attempt=1
  while :; do
    if curl -fsSL --connect-timeout 15 --max-time 120 "$url" \
      -o "$destination" 2>"$STAGING_DIR/curl-error"; then
      return 0
    else
      status=$?
    fi
    cat "$STAGING_DIR/curl-error" >&2
    retry=false
    case "$status" in
      7|18|28|52|56) retry=true ;;
      35)
        if grep -Eiq 'connection (was )?reset' "$STAGING_DIR/curl-error"; then
          retry=true
        fi
        ;;
    esac
    if [ "$retry" = false ] || [ "$attempt" -ge 3 ]; then
      echo "Error: Failed to download $url (curl $status, $attempt attempt(s))" >&2
      return "$status"
    fi
    echo "Retrying download after curl $status ($attempt/3)..." >&2
    sleep "$attempt"
    attempt=$((attempt + 1))
  done
}

# Get latest release URL (prefer jq, then node; grep is last-resort)
LATEST_URL="https://api.github.com/repos/${REPO}/releases/latest"
download "$LATEST_URL" "$STAGING_DIR/release.json"
RELEASE_DATA=$(cat "$STAGING_DIR/release.json")

extract_asset_url() {
  asset_name="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$RELEASE_DATA" | jq -r --arg name "$asset_name" \
      '.assets[] | select(.name == $name) | .browser_download_url' | head -n 1
  elif command -v node >/dev/null 2>&1; then
    # Pass the name via env to avoid -e argv index differences across Node versions.
    printf '%s' "$RELEASE_DATA" | ASSET_NAME="$asset_name" node -e "
      const name = process.env.ASSET_NAME;
      const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      const asset = (data.assets || []).find((a) => a.name === name);
      process.stdout.write(asset && asset.browser_download_url ? asset.browser_download_url : '');
    "
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

if [ -z "$CHECKSUM_URL" ]; then
  echo "Error: Could not find checksums.txt for this release"
  exit 1
fi

echo "Downloading from: $DOWNLOAD_URL"
STAGED_BINARY="$STAGING_DIR/$BINARY_NAME"
download "$DOWNLOAD_URL" "$STAGED_BINARY"
download "$CHECKSUM_URL" "$STAGING_DIR/checksums.txt"

echo "Verifying checksum..."
EXPECTED=$(awk -v name="$ARTIFACT" '$2 == name { print $1; exit }' "$STAGING_DIR/checksums.txt")
if [ "${#EXPECTED}" -ne 64 ] || printf '%s' "$EXPECTED" | grep -q '[^0-9a-f]'; then
  echo "Error: Missing or invalid SHA-256 checksum for $ARTIFACT"
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "$STAGED_BINARY" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL=$(shasum -a 256 "$STAGED_BINARY" | awk '{print $1}')
else
  echo "Error: sha256sum or shasum is required to verify the download"
  exit 1
fi

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "Error: Checksum verification failed!"
  echo "Expected: $EXPECTED"
  echo "Actual:   $ACTUAL"
  exit 1
fi
echo "Checksum verified ✓"

chmod +x "$STAGED_BINARY"
if ! "$STAGED_BINARY" --version; then
  echo "Error: Downloaded executable failed its --version check"
  exit 1
fi

# Never delete the old binary first: a failed move must leave it in place.
mv -f "$STAGED_BINARY" "${INSTALL_DIR}/${BINARY_NAME}"
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
