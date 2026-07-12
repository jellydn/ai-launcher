import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProviderError } from "../provider.ts";
import { OpencodeProvider } from "./opencode.ts";

describe("OpencodeProvider", () => {
  let tempDir: string;
  let fakeCommand: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "opencode-test-"));
    fakeCommand = join(tempDir, "opencode");
    writeFileSync(
      fakeCommand,
      `#!/usr/bin/env bash
input=$(cat)
echo '{"title":"Test","summary":"Fake opencode output","key_points":["one"],"action_items":[],"category":"article","importance":"low"}'
`
    );
    chmodSync(fakeCommand, 0o755);
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("streams output from opencode", async () => {
    const provider = new OpencodeProvider({ command: fakeCommand });
    const chunks: string[] = [];
    for await (const chunk of provider.generate({
      messages: [{ role: "user", content: "prompt" }],
      temperature: 0.1,
    })) {
      chunks.push(chunk);
    }
    const raw = chunks.join("");
    const parsed = JSON.parse(raw) as { summary: string };
    expect(parsed.summary).toBe("Fake opencode output");
  });

  test("throws ProviderError when command exits with non-zero code", async () => {
    const failCommand = join(tempDir, "opencode-fail");
    writeFileSync(
      failCommand,
      `#!/usr/bin/env bash
echo "opencode failed" >&2
exit 1
`
    );
    chmodSync(failCommand, 0o755);

    const provider = new OpencodeProvider({ command: failCommand });
    const generator = provider.generate({
      messages: [{ role: "user", content: "prompt" }],
      temperature: 0.1,
    });

    let thrown: unknown;
    try {
      for await (const _ of generator) {
        // consume
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ProviderError);
    expect(thrown instanceof ProviderError && thrown.message).toContain("exited with code 1");
    expect(thrown instanceof ProviderError && thrown.message).toContain("opencode failed");
  });

  test("throws ProviderError when command is not found", async () => {
    const provider = new OpencodeProvider({ command: join(tempDir, "does-not-exist") });
    const generator = provider.generate({
      messages: [{ role: "user", content: "prompt" }],
      temperature: 0.1,
    });

    let thrown: unknown;
    try {
      for await (const _ of generator) {
        // consume
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ProviderError);
  });
});
