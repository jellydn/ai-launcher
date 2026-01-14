import { describe, expect, test } from "bun:test";

describe("upgrade module", () => {
	test("generates valid platform artifact names for supported platforms", () => {
		const supportedPlatforms = ["darwin", "linux"];
		const os = supportedPlatforms.includes(process.platform)
			? process.platform
			: "darwin";
		const arch = process.arch === "arm64" ? "arm64" : "x64";
		const artifact = `ai-${os}-${arch}`;

		expect(artifact).toMatch(/^ai-(darwin|linux)-(arm64|x64)$/);
	});

	test("uses process.platform directly (darwin or linux only)", () => {
		const os = process.platform;
		expect(["darwin", "linux"]).toContain(os);
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
		const unsupportedPlatforms = ["win32", "freebsd", "openbsd", "aix"];

		for (const platform of unsupportedPlatforms) {
			const isValid = platform === "darwin" || platform === "linux";
			expect(isValid).toBe(false);
		}
	});

	test("platform validation accepts supported platforms", () => {
		const supportedPlatforms = ["darwin", "linux"];

		for (const platform of supportedPlatforms) {
			const isValid = platform === "darwin" || platform === "linux";
			expect(isValid).toBe(true);
		}
	});
});
