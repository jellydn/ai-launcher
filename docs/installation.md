# Installation

## One-line Install (macOS/Linux)

```sh
curl -fsSL https://raw.githubusercontent.com/jellydn/ai-cli-switcher/main/install.sh | sh
```

<details>
<summary>Safer alternative (inspect before running)</summary>

```sh
curl -fsSL -o install.sh https://raw.githubusercontent.com/jellydn/ai-cli-switcher/main/install.sh
less install.sh  # inspect the script
sh install.sh
```

</details>

## Homebrew (macOS/Linux)

```sh
brew install jellydn/tap/ai
```

## Windows

Download the latest `ai-windows-x64.exe` from [Releases](https://github.com/jellydn/ai-cli-switcher/releases) and add to your PATH.

## Build from Source

Requires [Bun](https://bun.sh):

```bash
git clone https://github.com/jellydn/ai-cli-switcher
cd ai-cli-switcher
bun install
bun run build
```

This produces a standalone executable at `dist/ai`.

## Manual Install

```bash
# Option 1: Symlink to /usr/local/bin (requires sudo)
sudo ln -sf "$(pwd)/dist/ai" /usr/local/bin/ai

# Option 2: Symlink to ~/.local/bin (no sudo required)
mkdir -p ~/.local/bin
ln -sf "$(pwd)/dist/ai" ~/.local/bin/ai
# Ensure ~/.local/bin is in your PATH
```

## Verify Installation

```bash
ai --help
```

[![ai --help](https://i.gyazo.com/271b43515723f8f95a492882fb5cf4c4.png)](https://gyazo.com/271b43515723f8f95a492882fb5cf4c4)

## Upgrading

To upgrade to the latest version:

```bash
# If installed via install.sh
curl -fsSL https://raw.githubusercontent.com/jellydn/ai-cli-switcher/main/install.sh | sh

# If installed via Homebrew
brew upgrade jellydn/tap/ai

# If built from source
cd ai-cli-switcher
git pull
bun install
bun run build
```
