#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { access, chmod, rename, unlink, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "./config";
import { detectInstalledTools, mergeTools } from "./detect";
import { fuzzySelect, toSelectableItems } from "./fuzzy-select";
import { findToolByName, toLookupItems } from "./lookup";
import { getColoredLogo } from "./logo";
import { createHash, randomUUID } from "node:crypto";
import { gte as semverGte } from "semver";
import { VERSION } from "./version";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

function validateToolCommand(command: string): boolean {
  const safePattern = /^[a-zA-Z0-9._\s\-"':,!?/\\|$@]+$/;
  return safePattern.test(command.trim()) && command.length > 0 && command.length <= 500;
}

function validateArguments(args: string[]): boolean {
  const safePattern = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;
  return args.every((arg) => safePattern.test(arg) && arg.length <= 200);
}

function readStdin(): string | null {
  try {
    if (process.stdin.isTTY) return null;
    return readFileSync(0, "utf-8").trim();
  } catch {
    return null;
  }
}

function showVersion() {
  console.log(`ai-cli-switcher v${VERSION}`);
  process.exit(0);
}

function showHelp() {
  console.log(getColoredLogo("full"));
  console.log(`A fast, secure launcher for AI coding assistants.

USAGE:
    ai [toolname|alias] [args...]    Direct invocation
    ai [toolname] -- [args...]       Explicit separator
    ai -- [args...]                  Fuzzy select, then pass args
    ai                               Interactive fuzzy search

OPTIONS:
    --help, -h                       Show this help message
    --version, -v                    Show version information
    upgrade                          Upgrade to latest version

EXAMPLES:
    ai                               Launch fuzzy search
    ai claude                        Launch Claude directly
    ai c                             Launch by alias
    ai claude --help                 Pass --help to claude
    ai -- --version                  Select tool, then show version
    ai upgrade                       Upgrade to latest version

CONFIG:
    ~/.config/ai-switcher/config.json   Add custom tools, aliases, templates
`);
  process.exit(0);
}

function launchTool(command: string, extraArgs: string[] = [], stdinContent: string | null = null) {
  if (!validateToolCommand(command)) {
    console.error("Invalid command format");
    process.exit(1);
  }

  if (!validateArguments(extraArgs)) {
    console.error("Invalid argument format");
    process.exit(1);
  }

  let finalCommand = command;

  const hasInput = extraArgs.length > 0 || (stdinContent !== null && stdinContent.length > 0);
  const argsOrStdin = extraArgs.length > 0 ? extraArgs.join(" ") : (stdinContent ?? "");

  if (command.includes("$@") && !hasInput) {
    console.error("This template requires input.");
    console.error("Usage: ai <template> <args...>  OR  <command> | ai <template>");
    process.exit(1);
  }

  if (command.includes("$@")) {
    finalCommand = command.replace("$@", argsOrStdin);
  } else if (argsOrStdin.length > 0) {
    finalCommand = `${command} ${argsOrStdin}`;
  }

  const parts = finalCommand.split(/\s+/).filter((p) => p !== "");
  const cmd = parts[0];
  if (!cmd) {
    console.error("Invalid command format");
    process.exit(1);
  }
  const args = parts.slice(1);

  const child = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
  });

  process.exit(child.status ?? 1);
}

async function upgrade() {
  const os = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const artifact = `ai-${os}-${arch}`;

  console.log(`Checking for updates...`);

  try {
    const response = await fetch(
      "https://api.github.com/repos/jellydn/ai-cli-switcher/releases/latest"
    );

    if (!response.ok) {
      console.error(`Failed to fetch release information: ${response.statusText}`);
      process.exit(1);
    }

    const release = (await response.json()) as GitHubRelease;
    const latestVersion = release.tag_name.replace(/^v/, "");

    if (semverGte(VERSION, latestVersion)) {
      console.log(`✓ Already on the latest version v${VERSION}`);
      process.exit(0);
    }

    console.log(`New version available: v${latestVersion} (current: v${VERSION})`);
    console.log(`Downloading ${artifact}...`);

    const asset = release.assets.find((a) => a.name === artifact);

    if (!asset) {
      console.error(`❌ No binary found for your platform (${os}-${arch})`);
      process.exit(1);
    }

    const downloadUrl = asset.browser_download_url;

    const tempBinaryPath = join(tmpdir(), `ai-new-${randomUUID()}`);

    console.log(`Downloading from: ${downloadUrl}`);

    const binaryResponse = await fetch(downloadUrl);
    if (!binaryResponse.ok) {
      console.error(`Failed to download binary: ${binaryResponse.statusText}`);
      process.exit(1);
    }

    const binaryData = await binaryResponse.arrayBuffer();
    await writeFile(tempBinaryPath, Buffer.from(binaryData));

    const checksumAsset = release.assets.find((a) => a.name === "checksums.txt");

    if (checksumAsset) {
      console.log("Verifying checksum...");
      const checksumResponse = await fetch(checksumAsset.browser_download_url);
      if (checksumResponse.ok) {
        const checksumText = await checksumResponse.text();
        const lines = checksumText.split("\n");
        let checksumVerified = false;
        for (const line of lines) {
          if (line.includes(artifact)) {
            const [expectedChecksum] = line.split(/\s+/);
            const fileBuffer = await readFile(tempBinaryPath);
            const actualChecksum = createHash("sha256").update(fileBuffer).digest("hex");

            if (expectedChecksum !== actualChecksum) {
              console.error(`❌ Checksum verification failed!`);
              console.error(`Expected: ${expectedChecksum}`);
              console.error(`Actual:   ${actualChecksum}`);
              await unlink(tempBinaryPath);
              process.exit(1);
            }
            console.log("✓ Checksum verified");
            checksumVerified = true;
            break;
          }
        }
        if (!checksumVerified) {
          console.warn(`⚠️  Could not find checksum for ${artifact} in checksums.txt`);
          console.warn("Proceeding without checksum verification...");
        }
      }
    }

    const binaryPath = await findBinaryPath();
    if (!binaryPath) {
      console.error("❌ Could not locate installed binary");
      console.error("Expected locations:");
      console.error("  • ~/.local/bin/ai");
      console.error("  • /usr/local/bin/ai");
      await unlink(tempBinaryPath);
      process.exit(1);
    }

    console.log(`Installing to: ${binaryPath}`);

    const backupPath = `${binaryPath}.backup`;
    let needsRestore = false;

    try {
      await chmod(tempBinaryPath, 0o755);
      await rename(binaryPath, backupPath);
      needsRestore = true;
      await rename(tempBinaryPath, binaryPath);
      needsRestore = false;
      await unlink(backupPath);
    } catch (error) {
      console.error(`❌ Failed to install: ${error instanceof Error ? error.message : error}`);

      try {
        if (needsRestore) {
          await rename(backupPath, binaryPath);
        }
      } catch (restoreError) {
        console.error(`⚠️  Failed to restore backup: ${restoreError instanceof Error ? restoreError.message : restoreError}`);
      }

      try {
        await unlink(tempBinaryPath);
      } catch (cleanupError) {
      }

      process.exit(1);
    }

    console.log(`✓ Successfully upgraded to v${latestVersion}`);
  } catch (error) {
    console.error(`❌ Upgrade failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function findBinaryPath(): Promise<string | null> {
  const possiblePaths = ["/usr/local/bin/ai"];

  if (process.env.HOME) {
    possiblePaths.unshift(join(process.env.HOME, ".local/bin/ai"));
  }

  if (process.execPath.endsWith("/ai")) {
    possiblePaths.unshift(process.execPath);
  }

  for (const path of possiblePaths) {
    try {
      await access(path);
      return path;
    } catch {
      continue;
    }
  }

  return null;
}

async function main() {
  const stdinContent = readStdin();

  const config = loadConfig();
  const detectedTools = detectInstalledTools();
  const allTools = mergeTools(config.tools, detectedTools);

  const items = toSelectableItems(allTools, config.templates);
  const lookupItems = toLookupItems(allTools, config.templates);

  if (items.length === 0) {
    console.error("❌ No AI tools found!\n");
    console.error("💡 Install one or more of these tools:");
    console.error("   • claude    - Anthropic Claude CLI");
    console.error("   • opencode  - OpenCode AI assistant");
    console.error("   • amp       - Sourcegraph Amp CLI");
    console.error("   • ccs       - Claude Code Switch");
    console.error("\n📝 Or add custom tools to ~/.config/ai-switcher/config.json");
    process.exit(1);
  }

  const args = process.argv.slice(2);

  if (args[0] === "--help" || args[0] === "-h") {
    showHelp();
  }

  if (args[0] === "--version" || args[0] === "-v") {
    showVersion();
  }

  if (args[0] === "upgrade") {
    await upgrade();
    return;
  }

  const dashIndex = args.indexOf("--");
  if (dashIndex !== -1) {
    const beforeDash = args.slice(0, dashIndex);
    const afterDash = args.slice(dashIndex + 1);

    if (beforeDash.length === 0) {
      const result = await fuzzySelect(items);
      if (result.cancelled) {
        process.exit(0);
      }
      if (result.item) {
        launchTool(result.item.command, afterDash, stdinContent);
      }
    } else if (beforeDash.length > 0) {
      const toolQuery = beforeDash[0];
      if (!toolQuery) {
        console.error("Invalid tool query");
        process.exit(1);
      }
      const lookupResult = findToolByName(toolQuery, lookupItems);
      if (lookupResult.success && lookupResult.item) {
        launchTool(lookupResult.item.command, afterDash, stdinContent);
        return;
      }
      console.error(lookupResult.error);
      process.exit(1);
    }
    return;
  }

  if (args.length > 0) {
    const toolQuery = args[0];
    if (!toolQuery) {
      console.error("Invalid tool query");
      process.exit(1);
    }
    const extraArgs = args.slice(1);

    const result = findToolByName(toolQuery, lookupItems);

    if (result.success && result.item) {
      launchTool(result.item.command, extraArgs, stdinContent);
      return;
    }

    console.error(result.error);
    process.exit(1);
  }

  const result = await fuzzySelect(items);

  if (result.cancelled) {
    process.exit(0);
  }

  if (result.item) {
    launchTool(result.item.command, [], stdinContent);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
