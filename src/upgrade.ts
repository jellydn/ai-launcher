import { execSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, chmod, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gte as semverGte } from "semver";
import { VERSION } from "./version";

const GITHUB_RELEASES_URL = "https://api.github.com/repos/jellydn/ai-launcher/releases/latest";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

const isWindows = process.platform === "win32";
const binaryExt = isWindows ? ".exe" : "";

async function findBinaryPath(): Promise<string | null> {
  const binaryName = `ai${binaryExt}`;

  try {
    const whichCmd = isWindows ? "where ai" : "which ai";
    const pathFromWhich = execSync(whichCmd, { encoding: "utf-8" }).trim().split("\n")[0];
    if (pathFromWhich && pathFromWhich.length > 0) {
      await access(pathFromWhich);
      return pathFromWhich;
    }
  } catch {}

  const possiblePaths: string[] = [];

  if (isWindows) {
    if (process.env.LOCALAPPDATA) {
      possiblePaths.push(join(process.env.LOCALAPPDATA, "ai-launcher", binaryName));
    }
    if (process.env.HOME) {
      possiblePaths.push(join(process.env.HOME, ".local", "bin", binaryName));
    }
  } else {
    if (process.env.HOME) {
      possiblePaths.unshift(join(process.env.HOME, ".local", "bin", binaryName));
    }
    possiblePaths.push(`/usr/local/bin/${binaryName}`);
  }

  const execSuffix = isWindows ? "\\ai.exe" : "/ai";
  if (process.execPath.endsWith(execSuffix)) {
    possiblePaths.unshift(process.execPath);
  }

  for (const path of possiblePaths) {
    try {
      await access(path);
      return path;
    } catch {
      // continue
    }
  }

  return null;
}

export async function upgrade() {
  if (
    process.platform !== "darwin" &&
    process.platform !== "linux" &&
    process.platform !== "win32"
  ) {
    console.error("❌ Upgrade is not supported on this platform");
    console.error(`   Detected platform: ${process.platform}`);
    process.exit(1);
  }

  const os = isWindows ? "windows" : process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const artifact = `ai-${os}-${arch}${binaryExt}`;

  console.log(`Checking for updates...`);

  try {
    const response = await fetch(GITHUB_RELEASES_URL);

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
      if (isWindows) {
        console.error("  • %LOCALAPPDATA%\\ai-launcher\\ai.exe");
        console.error("  • ~/.local/bin/ai.exe");
      } else {
        console.error("  • ~/.local/bin/ai");
        console.error("  • /usr/local/bin/ai");
      }
      await unlink(tempBinaryPath);
      process.exit(1);
    }

    console.log(`Installing to: ${binaryPath}`);

    const backupPath = `${binaryPath}.backup`;
    let needsRestore = false;

    try {
      if (!isWindows) {
        await chmod(tempBinaryPath, 0o755);
      }
      await rename(binaryPath, backupPath);
      needsRestore = true;
      await rename(tempBinaryPath, binaryPath);
      needsRestore = false;
      await unlink(backupPath);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error.code === "EACCES" || error.code === "EPERM")
      ) {
        console.error(`❌ Permission denied to write to ${binaryPath}\n`);
        if (isWindows) {
          console.error("Run the upgrade from an elevated terminal (Run as Administrator).\n");
        } else {
          console.error("Run the upgrade with elevated permissions:\n");
          console.error("    sudo ai upgrade\n");
        }
      } else {
        console.error(`❌ Failed to install: ${error instanceof Error ? error.message : error}`);
      }

      try {
        if (needsRestore) {
          await rename(backupPath, binaryPath);
        }
      } catch (restoreError) {
        console.error(
          `⚠️  Failed to restore backup: ${restoreError instanceof Error ? restoreError.message : restoreError}`
        );
      }

      try {
        await unlink(tempBinaryPath);
      } catch {}

      process.exit(1);
    }

    console.log(`✓ Successfully upgraded to v${latestVersion}`);
  } catch (error) {
    console.error(`❌ Upgrade failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
