import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { VERSION } from "../src/version";

const ROOT = resolve(import.meta.dir, "..");
const BIN = process.env.AI_LAUNCHER_BIN?.trim() || "";

type RunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runAi(args: string[], env: NodeJS.ProcessEnv, stdin?: string): RunResult {
  const command = BIN
    ? spawnSync(BIN, args, {
        cwd: ROOT,
        env,
        input: stdin,
        encoding: "utf-8",
        shell: false,
      })
    : spawnSync("bun", ["run", "src/index.ts", ...args], {
        cwd: ROOT,
        env,
        input: stdin,
        encoding: "utf-8",
        shell: false,
      });

  return {
    status: command.status,
    stdout: command.stdout ?? "",
    stderr: command.stderr ?? "",
  };
}

function writeExecutable(path: string, body: string): void {
  writeFileSync(path, body, { mode: 0o755 });
  chmodSync(path, 0o755);
}

describe("CLI e2e", () => {
  let homeDir = "";
  let binDir = "";
  let capturePath = "";
  let env: NodeJS.ProcessEnv = {};

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "ai-launcher-e2e-home-"));
    binDir = mkdtempSync(join(tmpdir(), "ai-launcher-e2e-bin-"));
    capturePath = join(homeDir, "capture.json");

    const configDir = join(homeDir, ".config", "ai-launcher");
    mkdirSync(configDir, { recursive: true });

    // Fake AI tool: records argv + stdin for assertions.
    writeExecutable(
      join(binDir, "fake-ai"),
      `#!/usr/bin/env bun
import { writeFileSync } from "node:fs";

const chunks: Buffer[] = [];
for await (const chunk of Bun.stdin.stream()) {
  chunks.push(Buffer.from(chunk));
}
const stdin = Buffer.concat(chunks).toString("utf-8");

writeFileSync(
  process.env.FAKE_AI_CAPTURE || "",
  JSON.stringify({
    argv: process.argv.slice(2),
    stdin,
  })
);
console.log("FAKE_AI_OK");
`
    );

    writeFileSync(
      join(configDir, "config.json"),
      `${JSON.stringify(
        {
          tools: [
            {
              name: "fake",
              command: "fake-ai",
              description: "Fake AI for e2e",
              aliases: ["fk"],
            },
          ],
          templates: [
            {
              name: "review",
              command: "fake-ai -x 'Review: $@'",
              description: "Review template",
              aliases: ["rev"],
            },
          ],
        },
        null,
        2
      )}\n`
    );

    env = {
      ...process.env,
      HOME: homeDir,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      FAKE_AI_CAPTURE: capturePath,
      // Keep CI deterministic: no interactive TTY assumptions.
      TERM: "dumb",
    };
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
    rmSync(binDir, { recursive: true, force: true });
  });

  test("--version prints package version", () => {
    const result = runAi(["--version"], env);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(`ai-launcher v${VERSION}`);
  });

  test("--help exits successfully", () => {
    const result = runAi(["--help"], env);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ai-launcher");
    expect(result.stdout.toLowerCase()).toContain("usage");
  });

  test("launches configured tool with multi-word argv after --", () => {
    // CLI args are still validated by validateArguments (no ;|& etc.).
    const payload = "hello world with spaces";
    const result = runAi(["fake", "--", payload], env);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FAKE_AI_OK");

    const capture = readCapture(capturePath);
    expect(capture.argv).toEqual([payload]);
    expect(capture.stdin).toBe("");
  });

  test("rejects shell metacharacters in CLI args", () => {
    const result = runAi(["fake", "--", "hello; echo PWNED"], env);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/invalid argument/i);
  });

  test("template substitutes multi-word input as one argv element", () => {
    const payload = "hello world with spaces";
    const result = runAi(["review", payload], env);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FAKE_AI_OK");

    const capture = readCapture(capturePath);
    expect(capture.argv).toEqual(["-x", `Review: ${payload}`]);
  });

  test("template accepts stdin input as one argv element (metacharacters stay literal)", () => {
    // Stdin is not subject to validateArguments; it must remain one literal argv token.
    const payload = "line1\nline2; rm -rf /";
    const result = runAi(["review"], env, payload);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FAKE_AI_OK");

    const capture = readCapture(capturePath);
    expect(capture.argv).toEqual(["-x", `Review: ${payload}`]);
  });

  test("unknown tool exits non-zero", () => {
    const result = runAi(["definitely-not-a-tool"], env);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`.toLowerCase()).toMatch(
      /no tool|not found|no match|unknown/
    );
  });

  test("prompt list works without installed AI tools", () => {
    const result = runAi(["prompt", "list"], env);
    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });
});

function readCapture(path: string): { argv: string[]; stdin: string } {
  return JSON.parse(readFileSync(path, "utf-8")) as { argv: string[]; stdin: string };
}
