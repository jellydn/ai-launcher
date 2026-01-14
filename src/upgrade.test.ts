import { describe, test, expect } from "bun:test";

describe("upgrade module", () => {
  test("generates valid platform artifact names", () => {
    const os = process.platform === "darwin" ? "darwin" : "linux";
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const artifact = `ai-${os}-${arch}`;

    expect(artifact).toMatch(/^ai-(darwin|linux)-(arm64|x64)$/);
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
});
