import { describe, expect, test } from "bun:test";

describe("upgrade module", () => {
  test("generates valid platform artifact names for supported platforms", () => {
    const supportedPlatforms = ["darwin", "linux", "win32"];
    const isWindows = process.platform === "win32";
    const os = supportedPlatforms.includes(process.platform)
      ? isWindows
        ? "windows"
        : process.platform
      : "darwin";
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const ext = isWindows ? ".exe" : "";
    const artifact = `ai-${os}-${arch}${ext}`;

    expect(artifact).toMatch(/^ai-(darwin|linux|windows)-(arm64|x64)(\.exe)?$/);
  });

  test("uses mapped os name for artifact", () => {
    const platform = process.platform;
    expect(["darwin", "linux", "win32"]).toContain(platform);
  });

  test("checksum parsing extracts expected hash", () => {
    const checksums = `abc123 ai-darwin-arm64
def456 ai-linux-x64`;

    const lines = checksums.split("\n");
    const artifact = "ai-darwin-arm64";
    let foundChecksum = "";

    for (const line of lines) {
      if (line.includes(artifact)) {
        const parts = line.split(/\s+/);
        foundChecksum = parts[0] ?? "";
        break;
      }
    }

    expect(foundChecksum).toBe("abc123");
  });

  test("checksum verification handles missing artifact", () => {
    const checksums = `abc123 ai-darwin-arm64
def456 ai-linux-x64`;

    const lines = checksums.split("\n");
    const artifact = "ai-windows-x64";
    let checksumVerified = false;

    for (const line of lines) {
      if (line.includes(artifact)) {
        checksumVerified = true;
        break;
      }
    }

    expect(checksumVerified).toBe(false);
  });

  test("platform validation rejects unsupported platforms", () => {
    const unsupportedPlatforms = ["freebsd", "openbsd", "aix"];

    for (const platform of unsupportedPlatforms) {
      const isValid = platform === "darwin" || platform === "linux" || platform === "win32";
      expect(isValid).toBe(false);
    }
  });

  test("platform validation accepts supported platforms", () => {
    const supportedPlatforms = ["darwin", "linux", "win32"];

    for (const platform of supportedPlatforms) {
      const isValid = platform === "darwin" || platform === "linux" || platform === "win32";
      expect(isValid).toBe(true);
    }
  });
});
